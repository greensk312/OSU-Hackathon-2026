chrome.storage.local.get('canvasToken', (result) => {
  if (!result.canvasToken) {
    showTokenModal()
  }
})

function showTokenModal() {
  // Avoid injecting twice
  if (document.getElementById('cst-modal-overlay')) return

  // Overlay
  const overlay = document.createElement('div')
  overlay.id = 'cst-modal-overlay'
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
  `

  // Modal box
  const modal = document.createElement('div')
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 28px;
    width: 380px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    font-family: sans-serif;
  `

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <h2 style="margin: 0; font-size: 18px; color: #111;">Welcome to Canvas Study Tool</h2>
      <button
        id="cst-close-btn"
        style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #888;
          line-height: 1;
          padding: 0 0 0 12px;
        "
      >✕</button>
    </div>
    <p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.5;">
      To get started, paste your Canvas API token below. You can generate one in
      Canvas under <strong>Account → Settings → Approved Integrations</strong>.
    </p>
    <input
      id="cst-token-input"
      type="password"
      placeholder="Paste your API token here"
      style="
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        margin-bottom: 10px;
        box-sizing: border-box;
      "
    />
    <button
      id="cst-save-btn"
      style="
        width: 100%;
        padding: 10px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
      "
    >Save Token</button>
    <p id="cst-error" style="color: #ef4444; font-size: 12px; margin-top: 8px; min-height: 16px;"></p>
  `

  //Close Button
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  const closeBtn = document.getElementById('cst-close-btn')
  closeBtn.addEventListener('click', () => {
    overlay.remove()
  })

  closeBtn.addEventListener('mouseover', () => {
    closeBtn.style.color = '#9e0000'
  })

  closeBtn.addEventListener('mouseout', () => {
    closeBtn.style.color = '#888'
  })

  // Save button logic
  document.getElementById('cst-save-btn').addEventListener('click', () => {
    const token = document.getElementById('cst-token-input').value.trim()
    const error = document.getElementById('cst-error')

    if (!token) {
      error.textContent = 'Please paste your token before saving.'
      return
    }

    chrome.storage.local.set({ canvasToken: token }, () => {
      // Remove modal on success
      overlay.remove()
    })
  })
}
// content.js

// simple button test
const testBtn = document.createElement('button');
testBtn.innerText = "Test Gemini Connection";
testBtn.style.position = "fixed";
testBtn.style.bottom = "20px";
testBtn.style.right = "20px";
testBtn.style.zIndex = "9999";
testBtn.style.padding = "10px";
testBtn.style.backgroundColor = "#3b5bdb";
testBtn.style.color = "white";
testBtn.style.border = "none";
testBtn.style.borderRadius = "5px";
testBtn.style.cursor = "pointer";

document.body.appendChild(testBtn);

// Add click listener to send message to background.js 
// update this to happen when you click the generate quizzes button or assignment breakdown
testBtn.addEventListener('click', () => {
  testBtn.innerText = "Connecting...";
  testBtn.disabled = true;

  chrome.runtime.sendMessage({ type: "TEST_GEMINI" }, (response) => {
    if (response && response.success) {
      alert("Success! Gemini says: " + response.message);
    } else {
      const errorMsg = response ? response.error : "Unknown error";
      alert("Connection Failed: " + errorMsg);
    }
    testBtn.innerText = "Test Gemini Connection";
    testBtn.disabled = false;
  });
});


// ── Level Guy: Progress Bar Box ──
// Injects a level/XP progress box above the To Do sidebar on the Canvas dashboard

function injectLevelBox() {
  // Only inject on the dashboard
  if (!window.location.pathname.match(/^\/$|^\/$/)) {
    // Also check for /courses or explicit dashboard path
    if (!window.location.pathname.includes('dashboard') && window.location.pathname !== '/') {
      return;
    }
  }

  // Find the right sidebar — Canvas uses a #right-side div for the To Do section
  const rightSide = document.getElementById('right-side');
  if (!rightSide) return;

  // Don't inject twice
  if (document.getElementById('level-box')) return;

  // ── Placeholder data (replace with real XP calc later) ──
  const level = 3;
  const currentXP = 340;
  const xpForNextLevel = 500;
  const progressPercent = Math.round((currentXP / xpForNextLevel) * 100);
  const userName = 'Student'; // pull from profile API later

  // ── Build the box ──
  const levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = `
    background: #ffffff;
    border: 1px solid #c7cdd1;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
    font-family: -apple-system, "Segoe UI", Helvetica, sans-serif;
  `;

  levelBox.innerHTML = `
    <!-- Title row -->
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    ">
      <h2 style="
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #2d3b45;
      ">Progress</h2>
      <span style="
        font-size: 12px;
        color: #6b7883;
      ">Level ${level}</span>
    </div>

    <!-- XP bar -->
    <div style="
      background: #e8eaed;
      border-radius: 10px;
      height: 18px;
      overflow: hidden;
      margin-bottom: 6px;
    ">
      <div id="level-xp-fill" style="
        background: linear-gradient(90deg, #2196F3, #4CAF50);
        height: 100%;
        width: ${progressPercent}%;
        border-radius: 10px;
        transition: width 0.6s ease;
      "></div>
    </div>

    <!-- XP text -->
    <div style="
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #6b7883;
      margin-bottom: 14px;
    ">
      <span>${currentXP} / ${xpForNextLevel} XP</span>
      <span>${progressPercent}%</span>
    </div>

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #e8eaed; margin: 0 0 12px 0;">

    <!-- Earn XP section -->
    <div>
      <h3 style="
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 600;
        color: #2d3b45;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">Earn XP</h3>

      <div id="level-tasks" style="
        display: flex;
        flex-direction: column;
        gap: 6px;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: #f5f6f7;
          border-radius: 4px;
          font-size: 12px;
        ">
          <span style="color: #2d3b45;">Submit HW1</span>
          <span style="
            color: #4CAF50;
            font-weight: 600;
            font-size: 11px;
          ">+50 XP</span>
        </div>

        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: #f5f6f7;
          border-radius: 4px;
          font-size: 12px;
        ">
          <span style="color: #2d3b45;">Daily Quiz</span>
          <span style="
            color: #4CAF50;
            font-weight: 600;
            font-size: 11px;
          ">+20 XP</span>
        </div>

        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: #f5f6f7;
          border-radius: 4px;
          font-size: 12px;
        ">
          <span style="color: #2d3b45;">Score 90%+ on Quiz 2</span>
          <span style="
            color: #4CAF50;
            font-weight: 600;
            font-size: 11px;
          ">+100 XP</span>
        </div>
      </div>
    </div>
  `;

  // Insert at the top of the right sidebar, above To Do
  rightSide.insertBefore(levelBox, rightSide.firstChild);
}

// ── Run it ──
// Canvas loads content dynamically, so we wait for the sidebar to exist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLevelBox);
} else {
  injectLevelBox();
}

// Fallback: if Canvas loads the sidebar after DOMContentLoaded (it sometimes does),
// watch for it with a short retry
let retryCount = 0;
const retryInterval = setInterval(() => {
  if (document.getElementById('level-box') || retryCount > 10) {
    clearInterval(retryInterval);
    return;
  }
  injectLevelBox();
  retryCount++;
}, 500);
// This function adds the quizzes and flashcards buttons to each course card in the dashboard
function addCourseButtons(containers) {
  containers.forEach(function(container) {
    let quizButton = document.createElement("a") // This anchor tag is a link to the URL quiz.html when clicked. This is our "button"
    quizButton.textContent = "Quizzes" // This is the name of the button
    quizButton.href = chrome.runtime.getURL("quiz.html") // This is the file/URL that the button will take to you
    quizButton.style.cssText = "display:block; padding:4px 8px; background:#0770A3; color:white; border-radius:4px; text-decoration:none; font-size:12px; margin-top:4px;"

    let flashCardButton = document.createElement("a")
    flashCardButton.textContent = "Flashcards"
    flashCardButton.href = chrome.runtime.getURL("flashcard.html")
    flashCardButton.style.cssText = "display:block; padding:4px 8px; background:#0770A3; color:white; border-radius:4px; text-decoration:none; font-size:12px; margin-top:4px;"

    container.appendChild(quizButton) // I think this is for the mutation observer below
    container.appendChild(flashCardButton) //  "  "
  })
}

let observer = new MutationObserver(function() {
  let containers = document.querySelectorAll(".ic-DashboardCard__action-container")
  if(containers.length > 0) {
    observer.disconnect()
    addCourseButtons(containers)
  }
})

observer.observe(document.body, {childList: true, subtree: true})
