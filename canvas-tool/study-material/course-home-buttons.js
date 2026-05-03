function addCourseHomeButtons(sidebar) {
  if (sidebar.querySelector('.cst-home-btn')) return;

  const courseId = getCourseId();
  const courseName = getCourseName();

  const quizBtn = document.createElement('a');
  quizBtn.textContent = '📝 Quizzes';
  quizBtn.className = 'cst-home-btn btn button-sidebar-wide';
  quizBtn.style.cursor = 'pointer';
  quizBtn.style.cssText = [
    'background: #0770A3;',
    'color: white;'
  ].join(' ');
  quizBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openStudyPanel('quiz', courseId);
  });

  const flashBtn = document.createElement('a');
  flashBtn.textContent = '🃏 Flashcards';
  flashBtn.className = 'cst-home-btn btn button-sidebar-wide';
  flashBtn.style.cursor = 'pointer';
  flashBtn.style.cssText = [
    'background: #0770A3;',
    'color: white;'
  ].join(' ');
  flashBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openStudyPanel('flashcards', courseId);
  });

  sidebar.prepend(quizBtn);
  sidebar.prepend(flashBtn);
}

function observeCourseHomeSidebar() {
  const SIDEBAR_SELECTOR = 'aside#right-side .course-options';

  function tryInject() {
    const sidebar = document.querySelector(SIDEBAR_SELECTOR);
    if (sidebar) addCourseHomeButtons(sidebar);
  }

  const observer = new MutationObserver(tryInject);
  observer.observe(document.body, { childList: true, subtree: true });
  tryInject();
}

function getCourseId() {
  const match = window.location.pathname.match(/\/courses\/(\d+)/);
  return match ? match[1] : null;
}

function getCourseName() {
  const crumb = document.querySelector('.ic-app-crumbs li:nth-child(2) span');
  return crumb ? crumb.textContent.trim() : null;
}

function openStudyPanel(type, courseId) {
  if (document.querySelector('#cst-study-panel')) return;

  const mainContent = document.getElementById('main');

  const panel = document.createElement('div');
  panel.id = 'cst-study-panel';
  panel.style.cssText = [
    'position: absolute;',
    'top: 0; left: 0; right: 0; bottom: 0;',
    'background: white;',
    'z-index: 999;',
    'padding: 24px;',
    'overflow-y: auto;',
  ].join(' ');

  fetch(chrome.runtime.getURL(`study-material/${type}.html`) + '?courseId=' + courseId)
    .then(r => r.text())
    .then(html => {
      panel.innerHTML = html;
      mainContent.style.position = 'relative';
      mainContent.appendChild(panel);

      panel.dataset.courseId = courseId;

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('study-material/quiz.js');
      panel.appendChild(script);
    });
}