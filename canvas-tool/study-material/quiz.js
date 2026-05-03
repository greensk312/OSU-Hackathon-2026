const BACKEND = 'https://canvas-bp7k.onrender.com';

const screens = {
    selection: document.getElementById('selection-screen'),
    loading: document.getElementById('loading-screen'),
    quiz: document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
    error: document.getElementById('error-screen')
}

function showScreen(name) {
    Object.values(screens).forEach(s => s.style.display = 'none');
    screens[name].style.display = 'block';
}

function getCourseId() {
    const panel = document.getElementById('cst-study-panel');
    if (panel) return panel.dataset.courseId;

    return null;
}

function loadCachedAnalysis(courseId) {
  return new Promise((resolve) => {
    chrome.storage.local.get('courseAnalyses', (result) => {
      const all = result.courseAnalyses || {};
      resolve(all[courseId] || null);
    });
  });
}

async function init() {
  const courseId = getCourseId();

  if (!courseId) {
    document.getElementById('error-text').textContent = 'No course ID found.';
    showScreen('error');
    return;
  }

  const analysis = await loadCachedAnalysis(courseId);

  if (!analysis) {
    document.getElementById('error-text').textContent = 
      'No analysis found for this course yet. Try again in a moment.';
    showScreen('error');
    return;
  }

  buildTopicSelection(analysis);
}

function buildTopicSelection(analysis) {
    function buildTopicSelection(analysis) {
        const topicList = document.getElementById('topic-list');
        topicList.style.display = 'block';

        const terms = analysis.key_terms || [];

        terms.forEach(term => {
            const btn = document.createElement('button');
            btn.textContent = term;
            btn.addEventListener('click', () => startQuiz(analysis, term));
            topicList.appendChild(btn);
        });

        document.getElementById('general-quiz-btn')
            .addEventListener('click', () => startQuiz(analysis, null));

        showScreen('selection');
    }
}

async function startQuiz(analysis, topic) {
  showScreen('loading');

  try {
    const res = await fetch(`${BACKEND}/generate/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, topic })
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);

    const quizData = await res.json();
    renderQuiz(quizData);

  } catch (err) {
    document.getElementById('error-text').textContent = 
      'Failed to generate quiz. Is the backend awake?';
    showScreen('error');
  }
}

init();