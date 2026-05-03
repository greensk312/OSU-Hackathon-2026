// =============================================================================
// level-system/xp-calculator.js — XP state and calculation logic
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Provides the data and math behind the leveling system. Right now it
//   returns hardcoded placeholder data, but the structure is set up so
//   you can swap in real Canvas API data later without changing the
//   files that consume it (level-box.js, content.js).
//
// LOAD ORDER:
//   This file is loaded FIRST in the content_scripts array in manifest.json.
//   That means its functions are globally available to every script that
//   loads after it — similar to defining a class in a header file in C++
//   and then #including it in other files.
//
// NEXT STEPS (TODO):
//   1. Use chrome.storage.local to persist XP between page loads
//   2. Pull real assignment data from Canvas API:
//      - GET /api/v1/courses/:id/assignments          → list of assignments
//      - GET /api/v1/courses/:id/assignments/:id/submissions → submission + grade
//   3. Calculate XP dynamically from submission status + grade
//   4. Trigger level-ups and store level in chrome.storage.local
// =============================================================================


/**
 * getXPState()
 *
 * Returns the current XP state object for the level box to render.
 * This is the single source of truth for all XP-related display data.
 *
 * @returns {Object} with properties:
 *   - level {number}         — the user's current level
 *   - currentXP {number}     — XP earned toward the next level
 *   - xpForNextLevel {number} — total XP needed to reach the next level
 *   - tasks {Array<{name: string, xp: number}>} — available XP-earning actions
 */
// eslint-disable-next-line no-unused-vars
function getXPState() {
  // ── Placeholder data ──
  // Replace this entire return block once Canvas API integration is working.
  // The shape of the return value is the "contract" — as long as you return
  // an object with these same keys, level-box.js will render it correctly.
  return {
    level: 3,
    currentXP: 340,
    xpForNextLevel: 500,
    tasks: [
      { name: 'Submit HW1', xp: 50 },
      { name: 'Daily Quiz', xp: 20 },
      { name: 'Score 90%+ on Quiz 2', xp: 100 }
    ]
  };
}


/**
 * calculateAssignmentXP(score, baseXP)
 *
 * Calculates total XP earned for completing an assignment.
 * Awards base XP just for submitting, plus a bonus scaled by grade.
 *
 * XP breakdown:
 *   - Submission alone:  baseXP (default 50)
 *   - Score >= 90%:      baseXP + (baseXP * 1.0)  = 100 XP total
 *   - Score >= 80%:      baseXP + (baseXP * 0.6)  = 80 XP total
 *   - Score >= 70%:      baseXP + (baseXP * 0.3)  = 65 XP total
 *   - Score < 70%:       baseXP + 0               = 50 XP total
 *
 * @param {number} score  — the student's percentage score (0–100)
 * @param {number} baseXP — XP awarded just for submitting (default: 50)
 * @returns {number} total XP earned (completion + grade bonus)
 */
// eslint-disable-next-line no-unused-vars
function calculateAssignmentXP(score, baseXP) {
  baseXP = baseXP || 50;          // default to 50 if not provided
  var completionXP = baseXP;       // you always get this for submitting

  // Determine bonus multiplier based on grade tier
  var bonusMultiplier = 0;
  if (score >= 90)      bonusMultiplier = 1.0;   // A-tier: double XP
  else if (score >= 80) bonusMultiplier = 0.6;   // B-tier: 60% bonus
  else if (score >= 70) bonusMultiplier = 0.3;   // C-tier: 30% bonus
  // Below 70: no bonus, just completion XP

  var bonusXP = Math.round(baseXP * bonusMultiplier);
  return completionXP + bonusXP;
}
