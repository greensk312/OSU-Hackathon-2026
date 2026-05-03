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
//     1. level-system/xp-calculator.js  — defines getXPState(), calculateAssignmentXP()
//     2. level-system/level-box.js      — defines injectLevelBox()
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


// =============================================================================
// 1. TOKEN CHECK — Make sure the user has connected their Canvas account
// =============================================================================
// On every Canvas page load, we check chrome.storage.local for a saved API
// token. If there isn't one, we show a modal asking the user to paste theirs.
// This is the first thing that runs because nothing else works without a token.

chrome.storage.local.get('canvasToken', function (result) {
  if (!result.canvasToken) {
    showTokenModal();
  }
});


// =============================================================================
// 2. LEVEL SYSTEM — Inject the XP progress box on the dashboard
// =============================================================================
// Calls injectLevelBox() from level-system/level-box.js.
// That function checks if we're on the dashboard, finds the right-side
// sidebar, and prepends the XP progress box above the "To Do" section.

function initLevelSystem() {
  // Safety check: make sure the level-box script loaded before us.
  // typeof check prevents a ReferenceError if the script somehow didn't load.
  if (typeof injectLevelBox === 'function') {
    injectLevelBox();
  }
}

// Try immediately if the DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading — wait for it to finish, then try
  document.addEventListener('DOMContentLoaded', initLevelSystem);
} else {
  // DOM is already ready — try right now
  initLevelSystem();
}

// RETRY LOOP: Canvas sometimes loads the sidebar AFTER DOMContentLoaded
// (it fetches sidebar content via AJAX). So we poll every 500ms, up to
// ~5 seconds, checking if our box exists yet. Once it's injected or we
// hit the retry limit, we stop polling.
var levelRetryCount = 0;
var levelRetryInterval = setInterval(function () {
  // Stop if the box already exists OR we've tried 10 times (5 seconds)
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
  // Don't inject the modal twice if it already exists on the page
  if (document.getElementById('cst-modal-overlay')) return;

  // -- Build the overlay (dark semi-transparent background) --
  var overlay = document.createElement('div');
  overlay.id = 'cst-modal-overlay';
  overlay.style.cssText = [
    'position: fixed;',
    'inset: 0;',                             // shorthand for top/right/bottom/left: 0
    'background: rgba(0, 0, 0, 0.5);',       // dark semi-transparent backdrop
    'z-index: 99999;',                        // sit on top of everything on Canvas
    'display: flex;',
    'align-items: center;',
    'justify-content: center;'
  ].join(' ');

  // -- Build the modal box (white card in the center) --
  var modal = document.createElement('div');
  modal.style.cssText = [
    'background: white;',
    'border-radius: 12px;',
    'padding: 28px;',
    'width: 380px;',
    'box-shadow: 0 20px 60px rgba(0,0,0,0.3);',
    'font-family: sans-serif;'
  ].join(' ');

  // -- Modal inner HTML: title, instructions, input, save button, error text --
  modal.innerHTML = [
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">',
    '  <h2 style="margin: 0; font-size: 18px; color: #111;">Welcome to Canvas Study Tool</h2>',
    '  <button id="cst-close-btn" style="',
    '    background: none; border: none; font-size: 20px;',
    '    cursor: pointer; color: #888; line-height: 1; padding: 0 0 0 12px;',
    '  ">✕</button>',
    '</div>',
    '<p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.5;">',
    '  To get started, paste your Canvas API token below. You can generate one in',
    '  Canvas under <strong>Account → Settings → Approved Integrations</strong>.',
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

  // -- Assemble and inject into the page --
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // -- Wire up the close button (X in top-right corner) --
  document.getElementById('cst-close-btn').addEventListener('click', function () {
    overlay.remove();
  });

  // -- Wire up the save button --
  document.getElementById('cst-save-btn').addEventListener('click', function () {
    var token = document.getElementById('cst-token-input').value.trim();
    var error = document.getElementById('cst-error');

    // Validate: don't save an empty string
    if (!token) {
      error.textContent = 'Please paste your token before saving.';
      return;
    }

    // Save to chrome.storage.local — this is accessible from popup.js,
    // background.js, and any content script in the extension
    chrome.storage.local.set({ canvasToken: token }, function () {
      overlay.remove(); // dismiss the modal on success
    });
  });
}
