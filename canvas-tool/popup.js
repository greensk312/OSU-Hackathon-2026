const setupScreen = document.getElementById('setup-screen')
const readyScreen = document.getElementById('ready-screen')
const tokenInput = document.getElementById('token-input')
const saveBtn = document.getElementById('save-btn')
const clearBtn = document.getElementById('clear-btn')
const errorMsg = document.getElementById('error-msg')

// On popup open, check if token already exists
chrome.storage.local.get('canvasToken', (result) => {
  if (result.canvasToken) {
    // Token exists — show ready screen
    showReadyScreen()
  } else {
    // No token — show setup screen
    showSetupScreen()
  }
})

// Save token
saveBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim()

  if (!token) {
    errorMsg.textContent = 'Please paste your token before saving.'
    return
  }

  chrome.storage.local.set({ canvasToken: token }, () => {
    showReadyScreen()
  })
})

// Clear token
clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('canvasToken', () => {
    showSetupScreen()
  })
})

function showReadyScreen() {
  setupScreen.style.display = 'none'
  readyScreen.style.display = 'block'
}

function showSetupScreen() {
  readyScreen.style.display = 'none'
  setupScreen.style.display = 'block'
  tokenInput.value = ''
  errorMsg.textContent = ''
}
