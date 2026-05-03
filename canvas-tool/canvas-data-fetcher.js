// =============================================================================
// canvas-data-fetcher.js — Canvas API data retrieval and formatting
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Fetches course data (syllabus + assignments) from the Canvas REST API
//   and formats it into the JSON shape the backend /analyze/content endpoint
//   expects. All functions are async and return structured objects.
//
// DEPENDS ON:
//   - A valid Canvas API token stored in chrome.storage.local as 'canvasToken'
//   - The Canvas instance base URL (auto-detected from current tab's hostname)
//
// USAGE (from content.js or course-buttons.js):
//   const payload = await buildAnalyzePayload(courseId);
//   if (payload.success) {
//     sendToBackend(payload.data);
//   } else {
//     console.error(payload.error);
//   }
//
// CANVAS API ENDPOINTS USED:
//   GET /api/v1/courses/:id                            → course info + syllabus_body
//   GET /api/v1/courses/:id/assignments?per_page=50    → assignment list
//
// NOTE ON CORS:
//   Canvas allows requests from chrome-extension:// origins when a valid
//   Authorization header is provided. No proxy needed.
// =============================================================================


// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * getCanvasBaseUrl()
 *
 * Derives the Canvas instance base URL from the current tab's hostname.
 * e.g. "https://canvas.instructure.com" or "https://myschool.instructure.com"
 *
 * @returns {string} base URL with no trailing slash
 */
function getCanvasBaseUrl() {
  return window.location.origin; // e.g. "https://pcc.instructure.com"
}


/**
 * getStoredToken()
 *
 * Retrieves the user's Canvas API token from chrome.storage.local.
 *
 * @returns {Promise<string|null>} the token string, or null if not set
 */
function getStoredToken() {
  return new Promise(function (resolve) {
    chrome.storage.local.get('canvasToken', function (result) {
      resolve(result.canvasToken || null);
    });
  });
}

async function analyzeCourseWithAI(courseId) {
  const payload = await buildAnalyzePayload(courseId);

  if(!payload.success){
    return {
      success: false,
      error: payload.error
    };
  }

  const response = await fetch('https://canvas-bp7k.onrender.com/analyze/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.data)
  });

  if(!response.ok){
    return {
      success: false,
      error: "Error getting AI response from backend"
    };
  }

  const analysis = await response.json();

  return { success: true, data: analysis };
}

async function saveAnalysis(courseId, analysis) {

}

async function canvasFetch(endpoint, token, baseUrl) {
  try {
    const url = baseUrl + endpoint;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: 'Canvas API error ' + response.status + ': ' + errText
      };
    }

    const data = await response.json();
    return { success: true, data };

  } catch (err) {
    return { success: false, error: 'Network error: ' + err.message };
  }
}

async function fetchCourseInfo(courseId) {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, error: 'No Canvas token found. Please set it up via the extension popup.' };
  }

  const baseUrl = getCanvasBaseUrl();
  // include[]=syllabus_body tells Canvas to include the syllabus in the response
  const result = await canvasFetch(
    '/api/v1/courses/' + courseId + '?include[]=syllabus_body',
    token,
    baseUrl
  );

  if (!result.success) return result;

  const course = result.data;

  // Strip HTML tags from syllabus to get plain text for the backend
  const syllabusText = stripHtml(course.syllabus_body || '');

  return {
    success: true,
    data: {
      title: course.name || 'Untitled Course',
      syllabus_text: syllabusText
    }
  };
}

async function fetchAssignments(courseId) {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, error: 'No Canvas token found.' };
  }

  const baseUrl = getCanvasBaseUrl();
  const allAssignments = [];

  // Canvas paginates large lists — we follow pages until there's no "next" link
  let endpoint = '/api/v1/courses/' + courseId + '/assignments?per_page=50&order_by=due_at';
  let hasMore = true;

  while (hasMore) {
    const result = await canvasFetch(endpoint, token, baseUrl);
    if (!result.success) return result;

    // Format each assignment into the shape the backend expects
    const formatted = result.data.map(function (a) {
      return {
        title: a.name || 'Untitled Assignment',
        description: stripHtml(a.description || ''),
        due_date: formatDueDate(a.due_at)  // ISO string → "YYYY-MM-DD"
      };
    });

    allAssignments.push.apply(allAssignments, formatted);

    // Canvas returns pagination info in the Link response header.
    // Since canvasFetch only returns the parsed JSON body (not headers),
    // we stop after one page here. To fully paginate, you'd need to return
    // headers from canvasFetch and parse the Link header for the "next" URL.
    // For most courses, 50 assignments per page is sufficient.
    hasMore = false; // Set to true and parse Link header for full pagination
  }

  return { success: true, data: allAssignments };
}

async function buildAnalyzePayload(courseId) {
  // Fetch both in parallel for speed
  const [courseResult, assignmentsResult] = await Promise.all([
    fetchCourseInfo(courseId),
    fetchAssignments(courseId)
  ]);

  if (!courseResult.success) {
    return { success: false, error: 'Failed to fetch course info: ' + courseResult.error };
  }

  if (!assignmentsResult.success) {
    return { success: false, error: 'Failed to fetch assignments: ' + assignmentsResult.error };
  }

  const payload = {
    syllabus_text: courseResult.data.syllabus_text,
    assignments: assignmentsResult.data,
    current_date: new Date().toISOString().split('T')[0]  // "YYYY-MM-DD"
  };

  return { success: true, data: payload };
}

function getCurrentCourseId() {
  const match = window.location.pathname.match(/\/courses\/(\d+)/);
  return match ? match[1] : null;
}

// Internal utility functions

function stripHtml(html) {
  if (!html) return '';

  // Use a temporary DOM element to let the browser parse the HTML
  var temp = document.createElement('div');
  temp.innerHTML = html;

  // Get text content (browser strips all tags automatically)
  var text = temp.textContent || temp.innerText || '';

  // Collapse multiple whitespace into single spaces and trim
  return text.replace(/\s+/g, ' ').trim();
}

function formatDueDate(isoString) {
  if (!isoString) return 'No due date';
  // Split at "T" to drop the time portion — gives us "YYYY-MM-DD"
  return isoString.split('T')[0];
}