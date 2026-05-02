// ── DOM refs ──
const setupView    = document.getElementById('setup-view');
const mainView     = document.getElementById('main-view');
const apiUrlInput  = document.getElementById('api-url');
const apiTokenInput = document.getElementById('api-token');
const saveBtn      = document.getElementById('save-btn');
const setupError   = document.getElementById('setup-error');
const userName     = document.getElementById('user-name');
const disconnectBtn = document.getElementById('disconnect-btn');
const coursesList   = document.getElementById('courses-list');

// ── Helpers ──

// Make an authenticated GET request to the Canvas API
async function canvasGet(baseUrl, endpoint, token) {
  const url = `https://${baseUrl}/api/v1${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function showView(view) {
  setupView.classList.add('hidden');
  mainView.classList.add('hidden');
  view.classList.remove('hidden');
}

function showError(msg) {
  setupError.textContent = msg;
  setupError.classList.remove('hidden');
}

function hideError() {
  setupError.classList.add('hidden');
}

// ── Render courses ──
function renderCourses(courses) {
  coursesList.innerHTML = '';

  // Filter to only active courses with a name
  const active = courses.filter(c => c.name && c.workflow_state !== 'deleted');

  if (active.length === 0) {
    coursesList.innerHTML = '<p class="no-courses">No active courses found.</p>';
    return;
  }

  for (const course of active) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-name">${course.name}</div>
      <div class="course-code">${course.course_code || ''}</div>
    `;
    coursesList.appendChild(card);
  }
}

// ── Load main view ──
async function loadMain(baseUrl, token) {
  showView(mainView);
  coursesList.innerHTML = '<p class="loading">Loading courses...</p>';

  try {
    // Fetch the current user's profile to display their name
    const profile = await canvasGet(baseUrl, '/users/self/profile', token);
    userName.textContent = profile.name || profile.short_name || '';

    // Fetch courses — per_page=50 is plenty for a student
    const courses = await canvasGet(baseUrl, '/courses?per_page=50&enrollment_state=active', token);
    renderCourses(courses);
  } catch (err) {
    coursesList.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// ── Events ──

// Connect button: validate the token, then save it
saveBtn.addEventListener('click', async () => {
  hideError();
  const baseUrl = apiUrlInput.value.trim();
  const token   = apiTokenInput.value.trim();

  if (!baseUrl || !token) {
    showError('Both fields are required.');
    return;
  }

  saveBtn.textContent = 'Connecting...';
  saveBtn.disabled = true;

  try {
    // Test the token by hitting the profile endpoint
    await canvasGet(baseUrl, '/users/self/profile', token);

    // Token works — save it
    await chrome.storage.local.set({ canvasBaseUrl: baseUrl, canvasToken: token });
    loadMain(baseUrl, token);
  } catch (err) {
    showError('Connection failed. Check your URL and token.');
  } finally {
    saveBtn.textContent = 'Connect';
    saveBtn.disabled = false;
  }
});

// Disconnect button: clear stored credentials
disconnectBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['canvasBaseUrl', 'canvasToken']);
  apiTokenInput.value = '';
  showView(setupView);
});

// ── Init: check for saved credentials on popup open ──
(async () => {
  const data = await chrome.storage.local.get(['canvasBaseUrl', 'canvasToken']);
  if (data.canvasBaseUrl && data.canvasToken) {
    loadMain(data.canvasBaseUrl, data.canvasToken);
  } else {
    showView(setupView);
  }
})();
