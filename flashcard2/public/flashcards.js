document.addEventListener('DOMContentLoaded', () => {
  // ---------- Theme Toggle with Persistence ----------
  const toggleThemeBtn = document.getElementById('toggle-theme');
  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }
  const storedTheme = localStorage.getItem('theme') || 'light';
  setTheme(storedTheme);
  toggleThemeBtn.addEventListener('click', () => {
    const current = localStorage.getItem('theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  // ---------- Retrieve Topic from URL Parameter ----------
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic') || 'default';
  const pageTitleEl = document.getElementById('page-title');
  pageTitleEl.textContent = `${capitalize(topic)} Flashcards`;
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ---------- Streak & Achievement System ----------
  let streak = parseInt(localStorage.getItem('streak') || "0", 10);
  function updateStreak() {
    streak++;
    localStorage.setItem('streak', streak);
    document.getElementById('streak-count').textContent = streak;
    const achievementMsg = document.getElementById('achievement-msg');
    if (streak >= 10 && streak < 20) achievementMsg.textContent = "Great job!";
    else if (streak >= 20 && streak < 30) achievementMsg.textContent = "Amazing!";
    else if (streak >= 30) achievementMsg.textContent = "Unstoppable!";
    else achievementMsg.textContent = "";
    // Animate pop-out effect
    achievementMsg.style.animation = 'none';
    void achievementMsg.offsetWidth;
    achievementMsg.style.animation = '';
  }

  // ---------- Flashcard Data & State ----------
  let flashcards = [];
  let currentCardIndex = 0;
  let isShowingAnswer = false;

  // ---------- DOM References ----------
  const frontImage = document.getElementById('front-image');
  const backImage = document.getElementById('back-image');
  const card = document.querySelector('.card');
  const currentCardEl = document.getElementById('current-card');
  const totalCardsEl = document.getElementById('total-cards');
  const progressFill = document.getElementById('progress-fill');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const returnBtn = document.getElementById('return-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const restartBtn = document.getElementById('restart-btn');
  const cardContainer = document.getElementById('card-container');

  function initFlashcards(data) {
    flashcards = data;
    totalCardsEl.textContent = flashcards.length;
    updateCard();
  }

  function updateCard() {
    if (isShowingAnswer) {
      card.classList.remove('flipped');
      isShowingAnswer = false;
      returnBtn.classList.add('hidden');
    }
    const currentCard = flashcards[currentCardIndex];
    frontImage.style.opacity = 0;
    backImage.style.opacity = 0;
    frontImage.onload = () => {
      frontImage.style.transition = 'opacity 0.3s';
      frontImage.style.opacity = 1;
    };
    backImage.onload = () => {
      backImage.style.transition = 'opacity 0.3s';
      backImage.style.opacity = 1;
    };
    frontImage.src = currentCard.question;
    backImage.src = currentCard.answer;
    currentCardEl.textContent = currentCardIndex + 1;
    updateProgress();
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = (currentCardIndex === flashcards.length - 1 && isShowingAnswer);
  }

  function updateProgress() {
    const progress = ((currentCardIndex + (isShowingAnswer ? 0.5 : 0)) / flashcards.length) * 100;
    progressFill.style.width = `${progress}%`;
  }

  // ---------- Card Interaction (Original Behavior) ----------
  cardContainer.addEventListener('click', () => {
    if (!isShowingAnswer) {
      card.classList.add('flipped');
      isShowingAnswer = true;
      returnBtn.classList.remove('hidden');
    } else if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      updateCard();
      updateStreak();
    }
    updateProgress();
  });

  prevBtn.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateCard();
      updateProgress();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (!isShowingAnswer) {
      card.classList.add('flipped');
      isShowingAnswer = true;
      returnBtn.classList.remove('hidden');
    } else if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      updateCard();
      updateStreak();
    }
    updateProgress();
  });

  returnBtn.addEventListener('click', () => {
    card.classList.remove('flipped');
    isShowingAnswer = false;
    returnBtn.classList.add('hidden');
    updateProgress();
  });

  shuffleBtn.addEventListener('click', () => {
    for (let i = flashcards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }
    currentCardIndex = 0;
    updateCard();
  });

  restartBtn.addEventListener('click', () => {
    currentCardIndex = 0;
    streak = 0;
    localStorage.setItem('streak', "0");
    document.getElementById('streak-count').textContent = "0";
    document.getElementById('achievement-msg').textContent = "";
    updateCard();
  });

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': prevBtn.click(); break;
      case 'ArrowRight': nextBtn.click(); break;
      case ' ':
        e.preventDefault();
        cardContainer.click();
        break;
      case 'r':
      case 'R': restartBtn.click(); break;
      case 's':
      case 'S': shuffleBtn.click(); break;
    }
  });

  // ---------- Fetch Flashcards Data ----------
  if (topic === 'random') {
    Promise.all([
      fetch('data/mechanics.json').then(res => res.json()),
      fetch('data/materials.json').then(res => res.json()),
      fetch('data/electricity.json').then(res => res.json()),
      fetch('data/waves.json').then(res => res.json()),
      fetch('data/photon.json').then(res => res.json())
    ])
    .then(dataArr => {
      let combined = [];
      dataArr.forEach(d => combined = combined.concat(d.flashcards));
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      initFlashcards(combined);
    })
    .catch(err => console.error("Error loading random flashcards:", err));
  } else {
    fetch(`data/${topic}.json`)
      .then(res => res.json())
      .then(data => {
        initFlashcards(data.flashcards);
      })
      .catch(err => console.error("Error loading flashcard data:", err));
  }
});
