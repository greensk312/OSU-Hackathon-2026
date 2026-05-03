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
        const panel = document.getElementById('cst-study-panel');
        if(panel && panel.dataset.analysis){
            resolve(JSON.parse(panel.dataset.analysis));
            return;
        }
    })
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

let questions = [];
let currentIndex = 0;
let score = 0;
let xp = 0;

function renderQuiz(quizData) {
  questions = quizData.questions;
  currentIndex = 0;
  score = 0;
  xp = 0;
  showScreen('quiz');
  showQuestion();
}

function showQuestion() {
  const q = questions[currentIndex];

  document.getElementById('question-counter').textContent =
    `Question ${currentIndex + 1} of ${questions.length}`;
  document.getElementById('question-text').textContent = q.question;

  // Clear old choices
  const container = document.getElementById('choices-container');
  container.innerHTML = '';

  const explanation = document.getElementById('explanation');
  explanation.style.display = 'none';

  // Build a button for each option
  Object.entries(q.options).forEach(([letter, text]) => {
    const btn = document.createElement('button');
    btn.textContent = `${letter}: ${text}`;
    btn.addEventListener('click', () => handleAnswer(letter, btn));
    container.appendChild(btn);
  });

  // Reset next button
  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = true;
  nextBtn.onclick = () => {
    currentIndex++;
    if (currentIndex < questions.length) {
      showQuestion();
    } else {
      showResults();
    }
  };
}

function handleAnswer(selectedLetter, selectedBtn) {
  const q = questions[currentIndex];
  const correct = q.correct_answer;

  // Lock all buttons so you can't change answer
  const allBtns = document.querySelectorAll('#choices-container button');
  allBtns.forEach(b => b.disabled = true);

  if (selectedLetter === correct) {
    score++;
    selectedBtn.style.background = 'green';
    selectedBtn.style.color = 'white';
  } else {
    selectedBtn.style.background = 'red';
    selectedBtn.style.color = 'white';
    // Highlight the correct answer
    allBtns.forEach(b => {
      if (b.textContent.startsWith(correct)) {
        b.style.background = 'green';
        b.style.color = 'white';
      }
    });
  }

  // Show explanation
  const explanation = document.getElementById('explanation');
  if (explanation) {
    explanation.textContent = q.explanation;
    explanation.style.display = 'block';
  }

  document.getElementById('next-btn').disabled = false;
}

function showResults() {
  const xp = score * 5;
  document.getElementById('score-text').textContent =
    `You got ${score} out of ${questions.length} correct. You earned ${xp} experience!`;

  window.postMessage({
    type: 'QUIZ_COMPLETE',
    score: score,
    total: questions.length,
    xp: xp
  }, '*')

  document.getElementById('retry-btn').onclick = () => {
    renderQuiz({ questions });
  };

  showScreen('results');
}

init();