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