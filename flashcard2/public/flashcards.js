document.addEventListener('DOMContentLoaded', () => {
  // ---------- Constants & State ----------
  const POINTS_CONFIG = {
    CARD_COMPLETION: 10,       // Points for completing a card
    STREAK_BONUS: 2,           // Bonus multiplier for streaks
    LEVEL_XP_THRESHOLD: 100    // Base XP needed for level up
  };

  // Game state management
  let gameState = {
    points: 0,
    level: 1,
    xp: 0,
    streak: 0,
    totalCardsCompleted: 0,
    completedCards: {},        // Track completed card IDs
    dailyChallenge: {
      completed: false,
      target: 10,
      progress: 0
    }
  };

  // Flashcard state management
  let flashcards = [];
  let currentCardIndex = 0;
  let isShowingAnswer = false;
  let cardStartTime = Date.now();

  // Sound effects - make sure to create these audio files
  const sounds = {
    flip: new Audio('sounds/flip.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    levelUp: new Audio('sounds/level-up.mp3')
  };
  let soundEnabled = true;

  // ---------- DOM References ----------
  const pageTitleEl = document.getElementById('page-title');
  const frontImage = document.getElementById('front-image');
  const backImage = document.getElementById('back-image');
  const card = document.querySelector('.card');
  const cardContainer = document.getElementById('card-container');
  const currentCardEl = document.getElementById('current-card');
  const totalCardsEl = document.getElementById('total-cards');
  const progressFill = document.getElementById('progress-fill');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const returnBtn = document.getElementById('return-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const restartBtn = document.getElementById('restart-btn');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  const toggleSoundBtn = document.getElementById('toggle-sound');
  const pointsDisplay = document.getElementById('points-display');
  const levelDisplay = document.getElementById('level-display');
  const streakDisplay = document.getElementById('streak-display');
  const timerDisplay = document.getElementById('timer-display');
  const xpProgressFill = document.getElementById('xp-progress-fill');
  const challengeProgress = document.getElementById('challenge-progress');
  const challengeCount = document.getElementById('challenge-count');
  const topicLabel = document.querySelectorAll('.topic-label');

  // ---------- Theme Management ----------
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
  
  toggleThemeBtn?.addEventListener('click', () => {
    const current = localStorage.getItem('theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  // ---------- Sound Management ----------
  toggleSoundBtn?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sound', soundEnabled.toString());
    toggleSoundBtn.innerHTML = soundEnabled ? 
      '<span class="material-icons text-xl">volume_up</span>' : 
      '<span class="material-icons text-xl">volume_off</span>';
    
    playSound('flip');
  });
  
  function playSound(sound) {
    if (!soundEnabled || !sounds[sound]) return;
    
    sounds[sound].currentTime = 0;
    sounds[sound].play().catch(err => {
      console.warn("Could not play sound:", err);
    });
  }

  // ---------- Topic & Data Loading ----------
  // Get topic from URL
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic') || 'mechanics';
  
  // Update page title
  if (pageTitleEl) {
    pageTitleEl.textContent = `${capitalize(topic)} Flashcards`;
  }
  
  // Update topic labels
  if (topicLabel) {
    topicLabel.forEach(label => {
      label.textContent = capitalize(topic);
    });
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Load flashcards data
  function loadFlashcards() {
    if (topic === 'random') {
      // For random mode, load all available topics and combine
      const topicFiles = ['mechanics', 'materials', 'electricity', 'waves', 'photon'];
      
      Promise.all(
        topicFiles.map(t => fetch(`${t}.json`)
          .then(res => res.json())
          .catch(() => ({ flashcards: [] }))
        )
      )
      .then(dataArr => {
        let combined = [];
        dataArr.forEach(data => {
          if (data.flashcards && Array.isArray(data.flashcards)) {
            combined = combined.concat(data.flashcards);
          }
        });
        
        // Shuffle the combined cards
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        
        initFlashcards(combined);
      })
      .catch(error => {
        console.error("Error loading random flashcards:", error);
        showErrorMessage("Could not load flashcards. Please try again later.");
      });
    } else {
      // Load a single topic
      fetch(`data/${topic}.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load ${topic}.json`);
          return res.json();
        })
        .then(data => {
          if (!data.flashcards || !Array.isArray(data.flashcards)) {
            throw new Error(`Invalid data format in ${topic}.json`);
          }
          initFlashcards(data.flashcards);
        })
        .catch(error => {
          console.error("Error loading flashcard data:", error);
          showErrorMessage("Could not load flashcards. Please try again later.");
        });
    }
  }

  function showErrorMessage(message) {
    const container = document.createElement('div');
    container.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
    container.innerHTML = `
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline">${message}</span>
    `;
    
    // Insert at the top of the main content
    const main = document.querySelector('main');
    if (main && main.firstChild) {
      main.insertBefore(container, main.firstChild);
    }
  }

  // Initialize the flashcards
  function initFlashcards(data) {
    console.log(`Loaded ${data.length} flashcards`);
    
    if (data.length === 0) {
      showErrorMessage("No flashcards found for this topic.");
      return;
    }
    
    flashcards = data;
    
    // Update UI
    if (totalCardsEl) totalCardsEl.textContent = flashcards.length;
    
    // Load saved state if available
    loadSavedState();
    
    // Initialize the first card
    updateCard();
    updateProgress();
    
    // Start timer
    updateTimer();
  }

  // ---------- Game State Management ----------
  function loadSavedState() {
    // Check localStorage for saved state
    const savedStateKey = `flashcards_state_${topic}`;
    const savedState = localStorage.getItem(savedStateKey);
    
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        currentCardIndex = state.currentCardIndex || 0;
        gameState = { ...gameState, ...state.gameState };
        
        // Ensure we don't go beyond the available cards
        if (currentCardIndex >= flashcards.length) {
          currentCardIndex = 0;
        }
        
        console.log("Loaded saved state:", state);
      } catch (error) {
        console.error("Error parsing saved state:", error);
      }
    }
    
    // Load game state from global storage
    const globalState = localStorage.getItem('gameState');
    if (globalState) {
      try {
        const state = JSON.parse(globalState);
        
        // Only load certain global properties
        gameState.points = state.points || 0;
        gameState.level = state.level || 1;
        gameState.xp = state.xp || 0;
        gameState.streak = state.streak || 0;
        
        // Load daily challenge
        if (state.dailyChallenge) {
          gameState.dailyChallenge = state.dailyChallenge;
          checkDailyChallenge();
        }
        
        // Update UI
        updateGameUI();
      } catch (error) {
        console.error("Error parsing global state:", error);
      }
    }
  }

  function saveState() {
    // Save topic-specific state
    const stateToSave = {
      currentCardIndex,
      gameState: {
        completedCards: gameState.completedCards,
        totalCardsCompleted: gameState.totalCardsCompleted
      }
    };
    
    localStorage.setItem(`flashcards_state_${topic}`, JSON.stringify(stateToSave));
    
    // Save global game state
    localStorage.setItem('gameState', JSON.stringify({
      points: gameState.points,
      level: gameState.level,
      xp: gameState.xp,
      streak: gameState.streak,
      dailyChallenge: gameState.dailyChallenge
    }));
  }

  function updateGameUI() {
    if (pointsDisplay) pointsDisplay.textContent = gameState.points;
    if (levelDisplay) levelDisplay.textContent = gameState.level;
    if (streakDisplay) streakDisplay.textContent = gameState.streak;
    
    // Update XP progress bar
    if (xpProgressFill) {
      const nextLevelXP = POINTS_CONFIG.LEVEL_XP_THRESHOLD * Math.pow(1.5, gameState.level - 1);
      const progress = (gameState.xp / nextLevelXP) * 100;
      xpProgressFill.style.width = `${progress}%`;
    }
    
    // Update daily challenge
    updateDailyChallengeUI();
  }

  function checkDailyChallenge() {
    const today = new Date().toDateString();
    
    // Reset challenge if it's a new day
    if (gameState.dailyChallenge.lastDate !== today) {
      gameState.dailyChallenge = {
        completed: false,
        target: 10,
        progress: 0,
        lastDate: today
      };
      
      saveState();
    }
  }

  function updateDailyChallengeProgress() {
    if (gameState.dailyChallenge.completed) return;
    
    gameState.dailyChallenge.progress++;
    
    // Check if challenge is completed
    if (gameState.dailyChallenge.progress >= gameState.dailyChallenge.target) {
      gameState.dailyChallenge.completed = true;
      
      // Award bonus
      awardPoints(50, "Daily Challenge Completed! +50 points");
    }
    
    updateDailyChallengeUI();
    saveState();
  }

  function updateDailyChallengeUI() {
    if (!challengeProgress || !challengeCount) return;
    
    const progress = gameState.dailyChallenge.progress;
    const target = gameState.dailyChallenge.target;
    const percentage = Math.min(100, (progress / target) * 100);
    
    challengeProgress.style.width = `${percentage}%`;
    challengeCount.textContent = `${progress}/${target}`;
  }

  function awardPoints(amount, message = null) {
    gameState.points += amount;
    gameState.xp += Math.floor(amount / 2);
    
    // Update UI
    if (pointsDisplay) pointsDisplay.textContent = gameState.points;
    
    // Check for level up
    checkLevelUp();
    
    // Show notification if message provided
    if (message) {
      showNotification(message);
    }
    
    // Show floating points animation
    showPointsAnimation(amount);
    
    // Save state
    saveState();
  }

  function checkLevelUp() {
    // Calculate XP needed for next level (exponential growth)
    const xpForNextLevel = POINTS_CONFIG.LEVEL_XP_THRESHOLD * Math.pow(1.5, gameState.level - 1);
    
    if (gameState.xp >= xpForNextLevel) {
      gameState.level++;
      gameState.xp = 0;
      
      // Update UI
      if (levelDisplay) levelDisplay.textContent = gameState.level;
      
      // Update XP progress bar
      if (xpProgressFill) xpProgressFill.style.width = "0%";
      
      // Show notification
      showNotification(`Level Up! You are now level ${gameState.level}`);
      
      // Play sound
      playSound('levelUp');
    } else {
      // Update XP progress bar
      if (xpProgressFill) {
        const nextLevelXP = POINTS_CONFIG.LEVEL_XP_THRESHOLD * Math.pow(1.5, gameState.level - 1);
        const progress = (gameState.xp / nextLevelXP) * 100;
        xpProgressFill.style.width = `${progress}%`;
      }
    }
  }

  function updateStreak() {
    // Check if already updated today
    const today = new Date().toDateString();
    const lastStreakDate = localStorage.getItem('lastStreakDate');
    
    if (lastStreakDate !== today) {
      gameState.streak++;
      localStorage.setItem('lastStreakDate', today);
      
      // Update UI
      if (streakDisplay) streakDisplay.textContent = gameState.streak;
      
      // Award streak bonus if milestone reached
      if (gameState.streak % 5 === 0) {
        const bonus = gameState.streak * 2;
        awardPoints(bonus, `${gameState.streak} day streak! +${bonus} bonus points`);
      }
    }
  }

  function updateCardCompletionStatus() {
    // Mark current card as completed
    const cardId = `${topic}_${currentCardIndex}`;
    gameState.completedCards[cardId] = true;
    
    // Update total count
    gameState.totalCardsCompleted = Object.keys(gameState.completedCards).length;
    
    // Update daily challenge
    updateDailyChallengeProgress();
    
    // Award points
    awardPoints(POINTS_CONFIG.CARD_COMPLETION);
  }

  // ---------- Card Management ----------
  function updateCard() {
    // Reset card state
    if (isShowingAnswer) {
      card.classList.remove('flipped');
      isShowingAnswer = false;
    }
    
    // Reset card timer
    cardStartTime = Date.now();
    
    // Update card content
    if (currentCardIndex < flashcards.length) {
      const currentCard = flashcards[currentCardIndex];
      
      // Update images with loading state
      frontImage.style.opacity = 0;
      backImage.style.opacity = 0;
      
      frontImage.onload = () => {
        frontImage.style.opacity = 1;
      };
      
      backImage.onload = () => {
        backImage.style.opacity = 1;
      };
      
      frontImage.onerror = () => {
        console.error(`Failed to load image: ${frontImage.src}`);
        frontImage.src = "placeholder.png"; // Create a placeholder image
        frontImage.style.opacity = 1;
      };
      
      backImage.onerror = () => {
        console.error(`Failed to load image: ${backImage.src}`);
        backImage.src = "placeholder.png";
        backImage.style.opacity = 1;
      };
      
      // Set the image sources
      frontImage.src = currentCard.question;
      backImage.src = currentCard.answer;
      
      // Update card number display
      if (currentCardEl) currentCardEl.textContent = currentCardIndex + 1;
      
      // Update button states
      updateButtonStates();
    }
  }

  function updateButtonStates() {
    if (prevBtn) prevBtn.disabled = currentCardIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCardIndex === flashcards.length - 1 && isShowingAnswer;
    if (returnBtn) returnBtn.disabled = !isShowingAnswer;
  }

  function updateProgress() {
    if (!progressFill) return;
    
    const progress = ((currentCardIndex + (isShowingAnswer ? 0.5 : 0)) / flashcards.length) * 100;
    progressFill.style.width = `${progress}%`;
  }

  let cardTimer;
  function updateTimer() {
    if (!timerDisplay) return;
    
    if (cardTimer) clearInterval(cardTimer);
    
    let seconds = 0;
    timerDisplay.textContent = '00:00';
    
    cardTimer = setInterval(() => {
      seconds++;
      const displayMinutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      const displaySeconds = (seconds % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${displayMinutes}:${displaySeconds}`;
    }, 1000);
  }

  // ---------- Event Handlers ----------
  // Card click handler - Modified for new interaction
  cardContainer?.addEventListener('click', () => {
    if (!isShowingAnswer) {
      // Show answer
      card.classList.add('flipped');
      isShowingAnswer = true;
      playSound('flip');
    } else {
      // Return to question
      card.classList.remove('flipped');
      isShowingAnswer = false;
      playSound('flip');
    }
    
    updateButtonStates();
    updateProgress();
  });

  // Previous button
  prevBtn?.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateCard();
      updateProgress();
      saveState();
    }
  });

  // Next button - Modified for new interaction
  nextBtn?.addEventListener('click', () => {
    if (isShowingAnswer) {
      // When showing answer, mark as completed and go to next card
      updateCardCompletionStatus();
      
      if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        updateCard();
        playSound('correct');
      }
    } else {
      // When showing question, flip to answer
      card.classList.add('flipped');
      isShowingAnswer = true;
      playSound('flip');
    }
    
    updateProgress();
    updateButtonStates();
    saveState();
  });

  // Return to question button
  returnBtn?.addEventListener('click', () => {
    if (isShowingAnswer) {
      card.classList.remove('flipped');
      isShowingAnswer = false;
      playSound('flip');
      
      updateProgress();
      updateButtonStates();
    }
  });

  // Shuffle button
  shuffleBtn?.addEventListener('click', () => {
    for (let i = flashcards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }
    
    currentCardIndex = 0;
    updateCard();
    updateProgress();
    
    showNotification("Cards shuffled!");
    playSound('flip');
  });

  // Restart button
  restartBtn?.addEventListener('click', () => {
    currentCardIndex = 0;
    updateCard();
    updateProgress();
    
    showNotification("Deck restarted");
    playSound('flip');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        prevBtn?.click();
        break;
      case 'ArrowRight':
        nextBtn?.click();
        break;
      case ' ':
        e.preventDefault();
        cardContainer?.click();
        break;
      case 'r':
      case 'R':
        restartBtn?.click();
        break;
      case 's':
      case 'S':
        shuffleBtn?.click();
        break;
    }
  });

  // ---------- Notification System ----------
  function showNotification(message, type = 'default') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-16 right-4 z-40';
      document.body.appendChild(container);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `
      notification ${type}
      bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
      rounded-lg shadow-lg p-3 mb-3 max-w-xs
      transform transition-all duration-300
      flex items-center
    `;
    
    // Add icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'error') icon = 'error';
    else if (type === 'warning') icon = 'warning';
    
    notification.innerHTML = `
      <span class="material-icons mr-2 text-${type === 'default' ? 'indigo' : type}-500">${icon}</span>
      <span>${message}</span>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Animation
    setTimeout(() => {
      notification.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function showPointsAnimation(points) {
    const container = document.getElementById('points-animation-container');
    if (!container) return;
    
    const animation = document.createElement('div');
    animation.className = 'points-animation';
    animation.textContent = `+${points}`;
    
    // Random position
    const x = Math.random() * (container.offsetWidth - 100);
    const y = Math.random() * (container.offsetHeight - 100);
    
    animation.style.left = `${x}px`;
    animation.style.top = `${y}px`;
    
    container.appendChild(animation);
    
    // Remove after animation
    setTimeout(() => animation.remove(), 1500);
  }

  // Initialize
  loadFlashcards();
  
  // Load sound preference
  const soundPref = localStorage.getItem('sound');
  if (soundPref !== null) {
    soundEnabled = soundPref === 'true';
    if (toggleSoundBtn) {
      toggleSoundBtn.innerHTML = soundEnabled ? 
        '<span class="material-icons text-xl">volume_up</span>' : 
        '<span class="material-icons text-xl">volume_off</span>';
    }
  }
  
  // Update streak on load
  updateStreak();
});