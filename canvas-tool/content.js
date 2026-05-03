// =============================================================================
// content.js — The "main" entry point for the Canvas Multitool extension
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Think of this like main() in a C++ program. It doesn't contain the actual
//   feature logic — instead, it calls functions defined in other files
//   (other "classes") that each handle one specific feature.
//
// HOW IT WORKS WITH OTHER FILES:
//   Chrome extensions can't use ES module imports (import/export) in content
//   scripts. Instead, manifest.json lists multiple JS files to load in order:
//
//     1. level-system/xp-calculator.js  — defines fetchXPState(), getCachedXPState()
//     2. level-system/level-box.js      — defines injectLevelBox(), injectLevelBoxLoading(), etc.
//     3. study-material/course-buttons.js — defines addCourseButtons(), observeCourseCards()
//     4. content.js (this file)          — calls all of the above
//
//   Because they're all loaded into the same page context, functions from
//   earlier scripts are globally available here — similar to how #include
//   works in C++ (the functions are in scope by the time this file runs).
//
// CANVAS DOM NOTE:
//   Canvas is a partially single-page app. It doesn't always have the full
//   DOM ready at DOMContentLoaded — some elements (like the sidebar, course
//   cards) load asynchronously via JavaScript after the initial page load.
//   That's why we use retry loops and MutationObservers throughout.
// =============================================================================


analyzeAllCourses();

chrome.storage.local.get('canvasToken', function (result) {
  if (!result.canvasToken) {
    showTokenModal();
  }
});


// =============================================================================
// 2. LEVEL SYSTEM — Inject the XP progress box on the dashboard
// =============================================================================
//
// Flow:
//   1. Wait for the sidebar (#right-side) to exist
//   2. Check for a saved token
//   3. If no token → show "no token" state
//   4. If token exists → show loading state → try cached data first →
//      fetch fresh data from Canvas API → render or show error
//
// The old version was synchronous (getXPState returned hardcoded data).
// Now it's async because we're making real API calls, so the orchestration
// uses Promises and the loading/error states from level-box.js.

function initLevelSystem() {
  // Safety check: make sure level-box.js loaded
  if (typeof injectLevelBoxLoading !== 'function') return;

  // Try to inject the loading state. Returns false if we're not on the
  // dashboard or sidebar doesn't exist yet.
  var injected = injectLevelBoxLoading();
  if (!injected) return;

  // Sidebar exists and loading box is showing — now fetch XP data
  fetchAndRenderXP();
}

/**
 * fetchAndRenderXP()
 *
 * Handles the full async flow:
 *   1. Read the token from storage
 *   2. If no token, show the no-token state
 *   3. If cached data exists, render it immediately (fast first paint)
 *   4. Fetch fresh data from Canvas API
 *   5. Render fresh data (replaces cached render) or show error
 */
async function fetchAndRenderXP() {
  // ── Get the token ──
  var token = await new Promise(function (resolve) {
    chrome.storage.local.get('canvasToken', function (result) {
      resolve(result.canvasToken || null);
    });
  });

  if (!token) {
    injectLevelBoxNoToken();
    return;
  }

  // ── Try rendering cached data first for instant feedback ──
  if (typeof getCachedXPState === 'function') {
    try {
      var cached = await getCachedXPState();
      if (cached) {
        injectLevelBox(cached);
        // Don't return — we still fetch fresh data below to update
      }
    } catch (e) {
      // Cache miss is fine, just continue to fresh fetch
      console.warn('Canvas Multitool: Could not load cached XP data', e);
    }
  }

  // ── Fetch fresh data from Canvas API ──
  if (typeof fetchXPState === 'function') {
    try {
      var state = await fetchXPState(token);
      injectLevelBox(state);
    } catch (e) {
      console.error('Canvas Multitool: XP fetch failed', e);
      // Only show error if we didn't already render cached data
      if (!document.getElementById('level-box') ||
          document.getElementById('level-box').querySelector('p[style*="Fetching"]')) {
        injectLevelBoxError();
      }
    }
  }
}


// ── Kick off the level system ──
// Try immediately if the DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLevelSystem);
} else {
  initLevelSystem();
}

// RETRY LOOP: Canvas sometimes loads the sidebar AFTER DOMContentLoaded
// (it fetches sidebar content via AJAX). So we poll every 500ms, up to
// ~5 seconds, checking if our box exists yet. Once it's injected or we
// hit the retry limit, we stop polling.
var levelRetryCount = 0;
var levelRetryInterval = setInterval(function () {
  if (document.getElementById('level-box') || levelRetryCount > 10) {
    clearInterval(levelRetryInterval);
    return;
  }
  initLevelSystem();
  levelRetryCount++;
}, 500);


// =============================================================================
// 3. COURSE CARD BUTTONS — Add Quiz & Flashcard links to each course card
// =============================================================================
// Calls observeCourseCards() from study-material/course-buttons.js.
// That function watches the DOM for Canvas course cards to appear and
// injects our buttons onto them.
//
// We call this from here (content.js) rather than putting the observer
// directly in course-buttons.js because content.js is the orchestrator —
// it decides WHEN each feature initializes, while the feature files
// define HOW they work. Same pattern as calling class methods from main().

if (typeof observeCourseCards === 'function') {
  observeCourseCards();
}

observeCourseHomeSidebar();

// =============================================================================
// 4. TOKEN MODAL — Prompt the user to enter their Canvas API token
// =============================================================================
// This is the only feature that lives directly in content.js because it's
// a one-time setup flow, not a recurring feature. It creates a modal overlay
// on the Canvas page with an input field and save button.
//
// The token gets saved to chrome.storage.local, which is shared across all
// parts of the extension (content scripts, popup, background worker).

function showTokenModal() {
  if (document.getElementById('cst-modal-overlay')) return;

  var overlay = document.createElement('div');
  overlay.id = 'cst-modal-overlay';
  overlay.style.cssText = [
    'position: fixed;',
    'inset: 0;',
    'background: rgba(0, 0, 0, 0.5);',
    'z-index: 99999;',
    'display: flex;',
    'align-items: center;',
    'justify-content: center;'
  ].join(' ');

  var modal = document.createElement('div');
  modal.style.cssText = [
    'background: white;',
    'border-radius: 12px;',
    'padding: 28px;',
    'width: 380px;',
    'box-shadow: 0 20px 60px rgba(0,0,0,0.3);',
    'font-family: sans-serif;'
  ].join(' ');

  modal.innerHTML = [
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">',
    '  <h2 style="margin: 0; font-size: 18px; color: #111;">Welcome to Canvas Study Tool</h2>',
    '  <button id="cst-close-btn" style="',
    '    background: none; border: none; font-size: 20px;',
    '    cursor: pointer; color: #888; line-height: 1; padding: 0 0 0 12px;',
    '  ">&#10005;</button>',
    '</div>',
    '<p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.5;">',
    '  To get started, paste your Canvas API token below. You can generate one in',
    '  Canvas under <strong>Account &rarr; Settings &rarr; Approved Integrations</strong>.',
    '</p>',
    '<input id="cst-token-input" type="password" placeholder="Paste your API token here"',
    '  style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;',
    '         font-size: 14px; margin-bottom: 10px; box-sizing: border-box;" />',
    '<button id="cst-save-btn" style="',
    '  width: 100%; padding: 10px; background: #6366f1; color: white;',
    '  border: none; border-radius: 6px; font-size: 14px; cursor: pointer;',
    '">Save Token</button>',
    '<p id="cst-error" style="color: #ef4444; font-size: 12px; margin-top: 8px; min-height: 16px;"></p>'
  ].join('\n');

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('cst-close-btn').addEventListener('click', function () {
    overlay.remove();
  });

  document.getElementById('cst-save-btn').addEventListener('click', function () {
    var token = document.getElementById('cst-token-input').value.trim();
    var error = document.getElementById('cst-error');

    if (!token) {
      error.textContent = 'Please paste your token before saving.';
      return;
    }

    chrome.storage.local.set({ canvasToken: token }, function () {
      overlay.remove();
      // Token was just saved — kick off the level system now
      initLevelSystem();
    });
  });
}