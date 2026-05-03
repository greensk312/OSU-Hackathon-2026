// =============================================================================
// level-system/xp-calculator.js — XP state and calculation logic
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Fetches real assignment and submission data from the Canvas API, calculates
//   XP using a grade-weighted formula, determines the user's level from a
//   scaling level curve, and caches the result in chrome.storage.local.
//
// DATA FLOW (from the spec):
//   1. Read Canvas API token from chrome.storage.local
//   2. Derive API base URL from window.location.origin
//   3. Fetch active courses → for each course, fetch assignments → for each
//      assignment, fetch the user's submission
//   4. Calculate XP per assignment based on submission status and grade
//   5. Determine level from total XP using the scaling curve
//   6. Cache the result in chrome.storage.local for quick re-renders
//   7. Return the data for level-box.js to render
//
// XP FORMULA:
//   - Graded:     50 + round((score / points_possible) * 100)
//   - Submitted:  50 (completion only, grade bonus added once graded)
//   - Unsubmitted: 0 (shown in "Earn XP" list with potential max of 150)
//
// LEVELING CURVE:
//   Level N requires N * 200 XP to complete.
//   Level 1→2: 200 XP, Level 2→3: 400 XP, Level 3→4: 600 XP, etc.
//
// LOAD ORDER:
//   Loaded FIRST in manifest.json content_scripts array.
//   Functions here are globally available to level-box.js and content.js.
//
// CALLED BY:
//   content.js → fetchAndRenderXP() calls fetchXPState()
// =============================================================================


// ── XP Constants (from the spec) ──
var XP_PER_SUBMISSION = 50;
var XP_GRADE_MULTIPLIER = 100;
var XP_PER_LEVEL = 200;


/**
 * fetchXPState(token)
 *
 * The main entry point. Fetches all Canvas data, calculates XP, determines
 * level, caches the result, and returns the state object for rendering.
 *
 * This is ASYNC (returns a Promise) — content.js must await it or use .then().
 *
 * @param {string} token — the user's Canvas API token
 * @returns {Promise<Object>} resolves to:
 *   {
 *     level: number,
 *     currentXP: number,        — XP progress into the current level
 *     xpForNextLevel: number,   — XP needed to complete the current level
 *     totalXP: number,          — lifetime XP across all assignments
 *     tasks: Array<{name, xp, dueAt, courseId, assignmentId}>,
 *     earnedAssignments: number  — count of assignments that awarded XP
 *   }
 */
// eslint-disable-next-line no-unused-vars
async function fetchXPState(token) {
  var apiBase = window.location.origin + '/api/v1';

  // ── Step 1: Fetch active courses ──
  var courses = await canvasFetch(apiBase + '/courses?enrollment_state=active&per_page=50', token);

  // ── Step 2: For each course, fetch assignments and submissions ──
  var allAssignments = [];

  for (var i = 0; i < courses.length; i++) {
    var course = courses[i];
    var courseId = course.id;
    var courseName = course.name || course.course_code || ('Course ' + courseId);

    // Fetch all assignments for this course
    var assignments;
    try {
      assignments = await canvasFetch(
        apiBase + '/courses/' + courseId + '/assignments?per_page=50',
        token
      );
    } catch (e) {
      // If we can't access a course's assignments (permissions, etc.), skip it
      console.warn('Canvas Multitool: Could not fetch assignments for course ' + courseId, e);
      continue;
    }

    // For each assignment, fetch the user's submission
    for (var j = 0; j < assignments.length; j++) {
      var assignment = assignments[j];

      // Skip unpublished assignments
      if (assignment.published === false) continue;

      var submission;
      try {
        submission = await canvasFetch(
          apiBase + '/courses/' + courseId + '/assignments/' + assignment.id + '/submissions/self',
          token
        );
      } catch (e) {
        // If submission fetch fails, treat as unsubmitted
        submission = null;
      }

      allAssignments.push({
        courseId: courseId,
        courseName: courseName,
        assignmentId: assignment.id,
        name: assignment.name,
        pointsPossible: assignment.points_possible,
        dueAt: assignment.due_at,
        submission: submission
      });
    }
  }

  // ── Step 3: Calculate XP for each assignment ──
  var totalXP = 0;
  var earnedAssignments = 0;
  var pendingTasks = [];

  for (var k = 0; k < allAssignments.length; k++) {
    var a = allAssignments[k];
    var sub = a.submission;

    var xpEarned = calculateAssignmentXP(a, sub);

    if (xpEarned > 0) {
      totalXP += xpEarned;
      earnedAssignments++;
    } else {
      // Unsubmitted — add to "Earn XP" task list with max potential XP
      var maxXP = XP_PER_SUBMISSION + XP_GRADE_MULTIPLIER; // 150
      pendingTasks.push({
        name: a.name,
        xp: maxXP,
        dueAt: a.dueAt,
        courseId: a.courseId,
        assignmentId: a.assignmentId
      });
    }
  }

  // ── Step 4: Sort pending tasks by due date (soonest first) ──
  pendingTasks.sort(function (a, b) {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;  // no due date → end of list
    if (!b.dueAt) return -1;
    return new Date(a.dueAt) - new Date(b.dueAt);
  });

  // Cap at 5 tasks per the spec
  var tasks = pendingTasks.slice(0, 5);

  // ── Step 5: Calculate level from total XP ──
  var levelInfo = calculateLevel(totalXP);

  // ── Step 6: Build and cache the state object ──
  var state = {
    level: levelInfo.level,
    currentXP: levelInfo.currentXP,
    xpForNextLevel: levelInfo.xpForNextLevel,
    totalXP: totalXP,
    tasks: tasks,
    earnedAssignments: earnedAssignments
  };

  // Cache in chrome.storage.local for quick re-renders on next page load
  chrome.storage.local.set({ xpData: state });

  return state;
}


/**
 * getCachedXPState()
 *
 * Returns cached XP data from chrome.storage.local, if available.
 * Used for instant rendering while the fresh API fetch is in progress.
 *
 * @returns {Promise<Object|null>} — cached state or null
 */
// eslint-disable-next-line no-unused-vars
async function getCachedXPState() {
  return new Promise(function (resolve) {
    chrome.storage.local.get('xpData', function (result) {
      resolve(result.xpData || null);
    });
  });
}


/**
 * calculateAssignmentXP(assignment, submission)
 *
 * Computes XP earned for a single assignment based on submission state.
 *
 * Formula (from the spec):
 *   - Graded (workflow_state === 'graded' && score !== null):
 *       50 + round((score / points_possible) * 100)
 *   - Submitted but not graded (has submitted_at but not graded):
 *       50 (completion XP only)
 *   - Not submitted:
 *       0
 *
 * @param {Object} assignment — { pointsPossible }
 * @param {Object|null} submission — { workflow_state, score, submitted_at }
 * @returns {number} XP earned
 */
function calculateAssignmentXP(assignment, submission) {
  if (!submission) return 0;

  var isGraded = submission.workflow_state === 'graded' && submission.score !== null;
  var isSubmitted = !!submission.submitted_at;

  if (isGraded) {
    var pointsPossible = assignment.pointsPossible || 1; // avoid division by zero
    var scorePercent = submission.score / pointsPossible;
    var gradeXP = Math.round(scorePercent * XP_GRADE_MULTIPLIER);
    return XP_PER_SUBMISSION + gradeXP;
  }

  if (isSubmitted) {
    return XP_PER_SUBMISSION; // completion only, grade bonus added once graded
  }

  return 0;
}


/**
 * calculateLevel(totalXP)
 *
 * Determines the user's current level from their lifetime XP total.
 *
 * Leveling curve: level N requires N * 200 XP to complete.
 *   Level 1→2: 200 XP
 *   Level 2→3: 400 XP
 *   Level 3→4: 600 XP
 *
 * Walk through levels, subtracting each level's cost until the remaining
 * XP can't afford the next level. The remainder is progress into the
 * current level.
 *
 * @param {number} totalXP — lifetime XP
 * @returns {Object} { level, currentXP, xpForNextLevel }
 */
function calculateLevel(totalXP) {
  var level = 1;
  var remaining = totalXP;

  while (true) {
    var cost = level * XP_PER_LEVEL;
    if (remaining >= cost) {
      remaining -= cost;
      level++;
    } else {
      break;
    }
  }

  return {
    level: level,
    currentXP: remaining,
    xpForNextLevel: level * XP_PER_LEVEL
  };
}


/**
 * canvasFetch(url, token)
 *
 * Wrapper around fetch() for Canvas API calls. Adds the auth header
 * and throws on non-OK responses so callers can try/catch.
 *
 * @param {string} url — full Canvas API URL
 * @param {string} token — Canvas API token
 * @returns {Promise<Object|Array>} parsed JSON response
 * @throws {Error} on non-OK HTTP status
 */
async function canvasFetch(url, token) {
  var response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (!response.ok) {
    throw new Error('Canvas API error: ' + response.status + ' ' + response.statusText);
  }

  return response.json();
}