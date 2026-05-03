
analyzeAllCourses();

chrome.storage.local.get('canvasToken', function (result) {
  if (!result.canvasToken) {
    showTokenModal();
  }
});

window.addEventListener('message', (event) => {
  if(event.data.type === 'QUIZ_COMPLETE') {
    const bonusXP = event.data.score * 5;

    chrome.storage.local.get('quizBonusXP', (result) => {
        const current = result.quizBonusXP || 0;
        chrome.storage.local.set({ quizBonusXP: current + bonusXP });
    });
  }
});


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

observeCourseHomeSidebar();

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