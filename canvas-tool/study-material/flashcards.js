const BACKEND = 'https://canvas-bp7k.onrender.com';

const screens = {
    selection: document.getElementById('selection-screen'),
    loading: document.getElementById('loading-screen'),
    card: document.getElementById('card-screen'),
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
        btn.addEventListener('click', () => startFlashcards(analysis, term));
        topicList.appendChild(btn);
    });

    document.getElementById('general-quiz-btn')
        .addEventListener('click', () => startFlashcards(analysis, null));

    showScreen('selection');
}

async function startFlashcards(analysis, topic) {
  showScreen('loading');

  try {
    const res = await fetch(`${BACKEND}/generate/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, topic })
    });

    if (!res.ok) throw new Error(`Backend error: ${res.status}`);

    const flashcardData = await res.json();
    renderFlashcards(flashcardData);

  } catch (err) {
    document.getElementById('error-text').textContent = 
      'Failed to generate flashcards. Is the backend awake?';
    showScreen('error');
  }
}

let cards = [];
let currentIndex = 0;
let isFlipped = false;

function renderFlashcards(flashcardData) {
  cards = flashcardData.flashcards;
  currentIndex = 0;
  
  titleEl = document.getElementById('deck-title');
  if (titleEl) titleEl.textContent = flashcardData.title || 'Flashcards';

  showScreen('card');
  showCard();
}

function showCard(){
    if(!cards.length) return;

    const card = cards[currentIndex];
    isFlipped = false;

    // reset the flip state
    const inner = document.getElementById('card-inner');
    inner.classList.remove('flipped');

    // populate cards front and back
    document.getElementById('card-front-text').textContent = card.front;
    document.getElementById('card-back-text').textContent  = card.back;

    // category
    const categoryEl = document.getElementById('card-category');
    if (categoryEl) categoryEl.textContent = card.category || '';

    // card count
    document.getElementById('card-counter').textContent = `${currentIndex + 1} / ${cards.length}`;
    
    // next and prev buttons
    document.getElementById('prev-btn').disabled = currentIndex == 0;
    document.getElementById('next-btn').disabled = currentIndex == cards.length - 1;
}
function flipCard(){
    isFlipped = !isFlipped;
    const inner = document.getElementById('card-inner');
    inner.classList.toggle('flipped', isFlipped);
}

// set up buttons
document.getElementById('card-inner').addEventListener('click', flipCard);

document.getElementById('prev-btn').addEventListener('click', ()=>{
    if(currentIndex > 0){
        currentIndex--;
        showCard();
    }
});

document.getElementById('next-btn').addEventListener('click', ()=>{
    if(currentIndex < cards.length - 1){
        currentIndex++;
        showCard();
    }
});

document.getElementById('restart-btn').addEventListener('click',()=>{
    currentIndex = 0;
    showCard();
});

init();