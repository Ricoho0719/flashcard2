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
      progress: 0,
      lastDate: new Date().toDateString() // Initialize with today's date
    }
  };

  // Flashcard state management
  let flashcards = [];
  let currentCardIndex = 0;
  let isShowingAnswer = false;
  let cardStartTime = Date.now();
  let timerInterval = null;    // Keep track of the timer interval
  let savedFlashcards = {};    // Track which cards are saved

  // Sound effects
  const sounds = {
    flip: new Audio('sounds/flip.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    levelUp: new Audio('sounds/level-up.mp3')
  };
  let soundEnabled = localStorage.getItem('sound') === 'true';

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
  const flipBtn = document.getElementById('flip-btn');
  const goToBtn = document.getElementById('goto-btn');
  const restartBtn = document.getElementById('restart-btn');
  const pointsDisplay = document.getElementById('points-display');
  const levelDisplay = document.getElementById('level-display');
  const streakDisplay = document.getElementById('streak-display');
  const timerDisplay = document.getElementById('timer-display');
  const xpProgressFill = document.getElementById('xp-progress-fill');
  const challengeProgress = document.getElementById('challenge-progress');
  const challengeCount = document.getElementById('challenge-count');
  const topicLabel = document.querySelectorAll('.topic-label');
  const saveCardBtn = document.getElementById('save-card-btn');
  const saveCardBtnBack = document.getElementById('save-card-btn-back');

  // ---------- Topic & Data Loading ----------
  // Get topic and specific card from URL
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic') || 'mechanics';
  const specificCardIndex = params.get('card') !== null ? parseInt(params.get('card')) : null;
  
  console.log("Topic:", topic, "Specific card index:", specificCardIndex);
  
  // Update page title with proper capitalization
  if (pageTitleEl) {
    pageTitleEl.textContent = `${capitalize(topic)} Flashcards`;
  }
  
  // Update topic labels
  if (topicLabel && topicLabel.length > 0) {
    topicLabel.forEach(label => {
      label.textContent = capitalize(topic);
    });
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Load user's saved flashcards
  function loadSavedFlashcards() {
    console.log("Loading saved flashcards...");
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log("No auth token found, using local storage fallback");
      loadSavedFlashcardsFromLocalStorage();
      return;
    }
    
    fetch('/api/saved-flashcards', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) {
        console.warn(`Failed to load saved flashcards: ${res.status}`);
        // Fall back to local storage if API fails
        loadSavedFlashcardsFromLocalStorage();
        return [];
      }
      return res.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data)) {
        console.warn("Invalid data format from saved flashcards API");
        return;
      }
      
      // Convert to a lookup object for easy checking
      savedFlashcards = {};
      data.forEach(card => {
        const key = `${card.topic}_${card.card_index}`;
        savedFlashcards[key] = card.id;
      });
      
      console.log(`Loaded ${Object.keys(savedFlashcards).length} saved flashcards from API:`, savedFlashcards);
      
      // Update UI for current card
      updateSaveButtonState();
    })
    .catch(err => {
      console.error("Error loading saved flashcards:", err);
      loadSavedFlashcardsFromLocalStorage();
    });
  }
  
  // Fallback method using localStorage
  function loadSavedFlashcardsFromLocalStorage() {
    try {
      const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
      savedFlashcards = localSaved;
      console.log(`Loaded ${Object.keys(savedFlashcards).length} saved flashcards from localStorage:`, savedFlashcards);
      updateSaveButtonState();
    } catch (error) {
      console.error("Error loading saved flashcards from localStorage:", error);
      savedFlashcards = {};
    }
  }

  // Save to localStorage as fallback
  function saveFlashcardsToLocalStorage() {
    try {
      localStorage.setItem('savedFlashcards', JSON.stringify(savedFlashcards));
    } catch (error) {
      console.error("Error saving flashcards to localStorage:", error);
    }
  }

  // Load flashcards data
// In flashcards.js - add or modify the loadFlashcards function
// Replace the loadFlashcards function in flashcards.js
function loadFlashcards() {
  // Get topic and subject ID from URL parameters
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic') || 'mechanics';
  const specificCardIndex = params.get('card') !== null ? parseInt(params.get('card')) : null;
  const subjectId = params.get('subjectId') || '1'; // Default to AS Physics (1)
  
  console.log("Loading flashcards for topic:", topic, "subjectId:", subjectId);
  
  if (topic === 'random') {
    // For random mode, load from all topics
    console.log("Loading random flashcards...");
    
    // Default topics for AS Physics
    const topicFiles = ['mechanics', 'materials', 'electricity', 'waves', 'photon'];
    
    // Try to load each topic JSON file
    Promise.all(
      topicFiles.map(t => 
        fetch(`data/${t}.json`)
          .then(res => {
            if (!res.ok) {
              console.warn(`Failed to load data/${t}.json (${res.status})`);
              return { flashcards: [] };
            }
            return res.json();
          })
          .catch(error => {
            console.error(`Error loading data/${t}.json:`, error);
            return { flashcards: [] };
          })
      )
    )
    .then(dataArr => {
      let combined = [];
      dataArr.forEach((data, index) => {
        if (data.flashcards && Array.isArray(data.flashcards)) {
          combined = combined.concat(data.flashcards);
        }
      });
      
      // Shuffle and limit to 10 cards
      if (combined.length > 0) {
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        const randomCards = combined.slice(0, 10);
        initFlashcards(randomCards);
      } else {
        showErrorMessage("No flashcards found. Please try another topic.");
      }
    })
    .catch(error => {
      console.error("Error loading random flashcards:", error);
      showErrorMessage("Could not load flashcards. Please try again later.");
    });
  } else {
    // Load a specific topic - keep the data/ folder path
    console.log(`Attempting to load data/${topic}.json`);
    
    fetch(`data/${topic}.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load data/${topic}.json (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!data.flashcards || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
          throw new Error(`No flashcards found in data/${topic}.json`);
        }
        console.log(`Successfully loaded ${data.flashcards.length} cards from data/${topic}.json`);
        initFlashcards(data.flashcards);
      })
      .catch(error => {
        console.error(`Error loading data/${topic}.json:`, error);
        showErrorMessage(`Could not load flashcards for ${topic}. Please try again later.`);
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
    console.log(`Loaded ${data.length} flashcards for ${topic}`);
    
    if (data.length === 0) {
      showErrorMessage("No flashcards found for this topic.");
      return;
    }
    
    flashcards = data;
    
    // Update UI
    if (totalCardsEl) totalCardsEl.textContent = flashcards.length;
    
    // Load saved state if available
    loadSavedState();
    
    // If a specific card index was requested, navigate to it
    if (specificCardIndex !== null) {
      navigateToSpecificCard();
    }
    
    // Initialize the card display
    updateCard();
    updateProgress();
    
    // Start timer
    startTimer();
    
    // Update UI with loaded state
    updateGameUI();
    
    // Load saved flashcards
    loadSavedFlashcards();
  }
  
  // Navigate to a specific card by index
  function navigateToSpecificCard() {
    if (specificCardIndex === null || specificCardIndex < 0 || specificCardIndex >= flashcards.length) {
      console.warn(`Invalid specific card index: ${specificCardIndex}`);
      currentCardIndex = 0;
      return;
    }
    
    currentCardIndex = specificCardIndex;
    console.log(`Navigating to card #${specificCardIndex}`);
  }

  // ---------- Game State Management ----------
  function loadSavedState() {
    // Check localStorage for saved state
    const savedStateKey = `flashcards_state_${topic}`;
    const savedState = localStorage.getItem(savedStateKey);
    
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        
        // Only apply these if no specific card was requested
        if (specificCardIndex === null) {
          currentCardIndex = state.currentCardIndex || 0;
        }
        
        // Ensure completedCards is loaded
        if (state.gameState && state.gameState.completedCards) {
          gameState.completedCards = state.gameState.completedCards;
        }
        
        // Load total cards completed
        if (state.gameState && typeof state.gameState.totalCardsCompleted === 'number') {
          gameState.totalCardsCompleted = state.gameState.totalCardsCompleted;
        }
        
        // Ensure we don't go beyond the available cards
        if (currentCardIndex >= flashcards.length) {
          currentCardIndex = 0;
        }
        
        console.log("Loaded saved state for", topic, "starting at card", currentCardIndex);
      } catch (error) {
        console.error("Error parsing saved state:", error);
        // Reset to defaults on error
        currentCardIndex = 0;
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
        
        console.log("Loaded global game state:", gameState);
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
    
    console.log("Game state saved");
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
    const oldPoints = gameState.points;
    gameState.points += amount;
    gameState.xp += Math.floor(amount / 2);
    
    // Update UI with animation
    if (pointsDisplay) {
      animateCounter(pointsDisplay, oldPoints, gameState.points);
    }
    
    // Check for level up
    checkLevelUp();
    
    // Show notification if message provided
    if (message) {
      showNotification(message, 'success');
    }
    
    // Show floating points animation
    showPointsAnimation(amount);
    
    // Save state
    saveState();
  }

  function animateCounter(element, startValue, endValue) {
    const duration = 500; // ms
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime >= duration) {
        element.textContent = endValue;
        return;
      }
      
      const progress = elapsedTime / duration;
      const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
      element.textContent = currentValue;
      
      requestAnimationFrame(updateCounter);
    }
    
    requestAnimationFrame(updateCounter);
  }

  function checkLevelUp() {
    // Calculate XP needed for next level (exponential growth)
    const xpForNextLevel = POINTS_CONFIG.LEVEL_XP_THRESHOLD * Math.pow(1.5, gameState.level - 1);
    
    if (gameState.xp >= xpForNextLevel) {
      const oldLevel = gameState.level;
      gameState.level++;
      gameState.xp = 0;
      
      // Update UI
      if (levelDisplay) {
        animateCounter(levelDisplay, oldLevel, gameState.level);
      }
      
      // Update XP progress bar
      if (xpProgressFill) {
        xpProgressFill.style.width = "0%";
        xpProgressFill.classList.add('pulse-animation');
        setTimeout(() => xpProgressFill.classList.remove('pulse-animation'), 1000);
      }
      
      // Show notification
      showNotification(`Level Up! You are now level ${gameState.level}`, 'levelup');
      
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
      const oldStreak = gameState.streak;
      gameState.streak++;
      localStorage.setItem('lastStreakDate', today);
      
      // Update UI
      if (streakDisplay) {
        animateCounter(streakDisplay, oldStreak, gameState.streak);
      }
      
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
    
    // Only update if not already completed
    if (!gameState.completedCards[cardId]) {
      gameState.completedCards[cardId] = true;
      
      // Update total count
      gameState.totalCardsCompleted = Object.keys(gameState.completedCards).length;
      
      // Update daily challenge
      updateDailyChallengeProgress();
      
      // Award points
      awardPoints(POINTS_CONFIG.CARD_COMPLETION);
    }
  }

  // ---------- Card Management ----------
  function updateButtonStates() {
    // Previous button
    if (prevBtn) {
      prevBtn.disabled = currentCardIndex === 0;
      prevBtn.classList.toggle('opacity-50', currentCardIndex === 0);
    }
    
    // Next button
    if (nextBtn) {
      nextBtn.disabled = currentCardIndex === flashcards.length - 1;
      nextBtn.classList.toggle('opacity-50', currentCardIndex === flashcards.length - 1);
    }
    
    // Flip button text
    if (flipBtn) {
      if (isShowingAnswer) {
        flipBtn.querySelector('.material-icons').textContent = 'refresh';
        flipBtn.querySelector('.material-icons').nextSibling.nodeValue = ' Question';
      } else {
        flipBtn.querySelector('.material-icons').textContent = 'visibility';
        flipBtn.querySelector('.material-icons').nextSibling.nodeValue = ' Answer';
      }
    }
  }
  
  function updateCard() {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
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
      
      // Show loading spinner
      const existingSpinner = document.getElementById('loading-spinner');
      if (!existingSpinner) {
        frontImage.insertAdjacentHTML('afterend', '<div id="loading-spinner" class="loading-spinner mx-auto"></div>');
      }
      const loadingSpinner = document.getElementById('loading-spinner');
      
      // Set up image load handlers
      frontImage.onload = () => {
        if (loadingSpinner) loadingSpinner.remove();
        frontImage.style.opacity = 1;
      };
      
      backImage.onload = () => {
        backImage.style.opacity = 1;
      };
      
      frontImage.onerror = () => {
        console.error(`Failed to load image: ${currentCard.question}`);
        if (loadingSpinner) loadingSpinner.remove();
        frontImage.src = "placeholder.png"; // Create a placeholder image
        frontImage.style.opacity = 1;
        showNotification("Failed to load question image", "error");
      };
      
      backImage.onerror = () => {
        console.error(`Failed to load image: ${currentCard.answer}`);
        backImage.src = "placeholder.png";
        backImage.style.opacity = 1;
      };
      
      // Set the image sources
      frontImage.src = currentCard.question;
      backImage.src = currentCard.answer;
      
      // Update card number display
      if (currentCardEl) {
        // Display human-readable number (1-based)
        currentCardEl.textContent = currentCardIndex + 1;
      }
      
      // Update button states
      updateButtonStates();
      
      // Start new timer
      startTimer();
      
      // Update save button state
      updateSaveButtonState();
    }
  }
  
  function updateSaveButtonState() {
    const updateBtn = (btn) => {
      if (!btn) return;
      
      const cardKey = `${topic}_${currentCardIndex}`;
      const isSaved = savedFlashcards[cardKey] !== undefined;
      
      console.log(`Checking saved state for card: ${cardKey}, saved: ${isSaved}`);
      
      const icon = btn.querySelector('.save-icon');
      if (icon) {
        if (isSaved) {
          icon.textContent = 'bookmark';
          icon.classList.add('text-yellow-500');
        } else {
          icon.textContent = 'bookmark_border';
          icon.classList.remove('text-yellow-500');
        }
      }
    };
    
    // Update both front and back save buttons
    updateBtn(saveCardBtn);
    updateBtn(saveCardBtnBack);
  }

  function setupSaveButton(btn) {
    btn?.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click event
      
      const cardKey = `${topic}_${currentCardIndex}`;
      const isSaved = savedFlashcards[cardKey] !== undefined;
      
      console.log('Saving/unsaving card:', cardKey, 'Current saved state:', isSaved);
      
      // Get token immediately (so it's available for both save and unsave paths)
      const token = localStorage.getItem('authToken');
      
      if (isSaved) {
        // 1. Save the ID first before doing anything else
        const savedId = savedFlashcards[cardKey];
        console.log('Found saved ID for deletion:', savedId);
        
        // 2. Check if we have a valid ID before proceeding
        if (savedId === undefined) {
          console.error('Cannot unsave card - ID is undefined');
          showNotification("Error: Cannot identify saved card", "error");
          return;
        }
        
        // 3. Now it's safe to update the UI and memory state
        delete savedFlashcards[cardKey];
        updateSaveButtonState();
        showNotification("Removing flashcard from saved items...", "default");
        
        // Check token here (after UI updates for better UX)
        if (!token) {
          console.log('No auth token, using localStorage only');
          saveFlashcardsToLocalStorage();
          showNotification("Flashcard removed locally", "default");
          return;
        }
        
        // 4. Make the API request with the saved ID
        fetch(`/api/saved-flashcards/${savedId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => {
          console.log('Unsave response:', res.status);
          if (!res.ok) {
            throw new Error(`Failed to unsave card: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Unsave data:', data);
          showNotification("Flashcard removed from saved items", "default");
          saveFlashcardsToLocalStorage();
        })
        .catch(err => {
          console.error("Error removing saved flashcard:", err);
          // Restore the flashcard in memory if deletion failed
          savedFlashcards[cardKey] = savedId;
          updateSaveButtonState();
          showNotification("Error removing flashcard", "error");
          saveFlashcardsToLocalStorage();
        });
      } else {
        // Add the card to savedFlashcards with a temporary ID
        savedFlashcards[cardKey] = 'temp-' + Date.now();
        updateSaveButtonState();
        showNotification("Saving flashcard...", "default");
        
        // Check token
        if (!token) {
          console.log('No auth token, using localStorage only');
          saveFlashcardsToLocalStorage();
          showNotification("Flashcard saved locally", "success");
          return;
        }
        
        // Save the card
        console.log('Attempting to save card with index:', currentCardIndex);
        
        fetch('/api/save-flashcard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            topic,
            cardIndex: currentCardIndex
          })
        })
        .then(res => {
          console.log('Save response:', res.status);
          if (!res.ok) {
            throw new Error(`Failed to save card: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Save data:', data);
          if (data.success && data.id) {
            savedFlashcards[cardKey] = data.id;
            showNotification("Flashcard saved successfully", "success");
            playSound('correct');
            saveFlashcardsToLocalStorage(); 
          }
        })
        .catch(err => {
          console.error("Error saving flashcard:", err);
          showNotification("Saved locally only", "info");
          saveFlashcardsToLocalStorage();
        });
      }
    });
  }

  function updateProgress() {
    if (!progressFill) return;
    
    // Calculate progress based only on card index, not flipped state
    const progress = (currentCardIndex / (flashcards.length - 1)) * 100;
    progressFill.style.width = `${progress}%`;
  }

  function startTimer() {
    if (!timerDisplay) return;
    
    // Clear existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    let seconds = 0;
    timerDisplay.textContent = '00:00';
    
    timerInterval = setInterval(() => {
      seconds++;
      const displayMinutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      const displaySeconds = (seconds % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${displayMinutes}:${displaySeconds}`;
    }, 1000);
  }

  // ---------- Event Handlers ----------
  // Card container click - flips the card
  cardContainer?.addEventListener('click', (e) => {
    // Don't flip if clicking on the save button
    if (e.target.closest('#save-card-btn') || e.target.closest('#save-card-btn-back')) {
      return;
    }
    
    flipCard();
  });

  // Flip card function
  function flipCard() {
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
  }

  // Previous button - navigate to previous card
  prevBtn?.addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      updateCard();
      updateProgress();
      playSound('flip');
      saveState();
    }
  });

  // Next button - navigate to next card
  nextBtn?.addEventListener('click', () => {
    if (currentCardIndex < flashcards.length - 1) {
      // Mark current card as complete if we've seen the answer
      if (isShowingAnswer) {
        updateCardCompletionStatus();
      }
      
      currentCardIndex++;
      updateCard();
      updateProgress();
      playSound('flip');
      saveState();
    }
  });

  // Flip button - toggle between question and answer
  flipBtn?.addEventListener('click', () => {
    flipCard();
  });
  
  // Set up save buttons
  if (saveCardBtn) setupSaveButton(saveCardBtn);
  if (saveCardBtnBack) setupSaveButton(saveCardBtnBack);

  // Go To button - open a dialog to navigate to a specific card
  goToBtn?.addEventListener('click', () => {
    // Get the current number of cards
    const numCards = flashcards.length;
    
    // Prompt user for card number
    const cardNum = prompt(`Enter card number (1-${numCards}):`, currentCardIndex + 1);
    
    // Validate and navigate
    if (cardNum !== null) {
      const parsedNum = parseInt(cardNum.trim());
      
      // Check if input is a valid number and in range
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= numCards) {
        currentCardIndex = parsedNum - 1; // Convert to 0-based index
        updateCard();
        updateProgress();
        playSound('flip');
        saveState();
        
        showNotification(`Navigated to card ${parsedNum}`);
      } else {
        showNotification(`Please enter a valid number between 1 and ${numCards}`, 'error');
      }
    }
  });

  // Restart button
  restartBtn?.addEventListener('click', () => {
    currentCardIndex = 0;
    updateCard();
    updateProgress();
    
    showNotification("Deck restarted");
    playSound('flip');
    saveState();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't handle shortcuts if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (e.key) {
      case 'ArrowLeft':
        prevBtn?.click();
        break;
      case 'ArrowRight':
        nextBtn?.click();
        break;
      case ' ':
        e.preventDefault();
        flipCard();
        break;
      case 'r':
      case 'R':
        if (e.ctrlKey || e.metaKey) return; // Don't intercept save shortcut
        restartBtn?.click();
        break;
      case 'g':
      case 'G':
        if (e.ctrlKey || e.metaKey) return; // Don't intercept browser shortcuts
        goToBtn?.click();
        break;
      case 'b':
      case 'B':
        if (e.ctrlKey || e.metaKey) return; // Don't intercept bookmark shortcut
        // Toggle save state
        saveCardBtn?.click();
        break;
      case 'Escape':
        // Return to topics page
        window.location.href = 'index.html';
        break;
    }
  });

  // ---------- Sound Functions ----------
  function playSound(sound) {
    if (!soundEnabled || !sounds[sound]) return;
    
    const soundEffect = sounds[sound];
    
    // Create a clone of the audio element to allow overlapping sounds
    if (sound === 'flip') { // Only clone flip sound for rapid interactions
      const clone = soundEffect.cloneNode();
      clone.volume = 0.7;
      clone.play().catch(err => {
        console.warn("Could not play sound:", err);
      });
    } else {
      // For other sounds, just restart
      soundEffect.currentTime = 0;
      soundEffect.volume = 0.7;
      soundEffect.play().catch(err => {
        console.warn("Could not play sound:", err);
      });
    }
  }

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
      bg-white text-gray-800 
      rounded-lg shadow-lg p-3 mb-3 max-w-xs
      transform transition-all duration-300
      flex items-center
    `;
    
    // Add icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'error') icon = 'error';
    else if (type === 'warning') icon = 'warning';
    else if (type === 'levelup') icon = 'emoji_events';
    
    notification.innerHTML = `
      <span class="material-icons mr-2 text-${type === 'default' ? 'indigo' : type === 'levelup' ? 'yellow' : type}-500">${icon}</span>
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
    animation.className = 'floating-points';
    animation.textContent = `+${points}`;
    
    // Position near points counter
    const pointsRect = pointsDisplay ? pointsDisplay.getBoundingClientRect() : null;
    if (pointsRect) {
      animation.style.left = `${pointsRect.left + pointsRect.width / 2}px`;
      animation.style.top = `${pointsRect.top}px`;
    } else {
      // Random position if points display not found
      const x = Math.random() * (container.offsetWidth - 100);
      const y = Math.random() * (container.offsetHeight - 100);
      
      animation.style.left = `${x}px`;
      animation.style.top = `${y}px`;
    }
    
    container.appendChild(animation);
    
    // Remove after animation
    setTimeout(() => animation.remove(), 1500);
  }

  // Initialize
  loadFlashcards();
  
  // Update streak on load
  updateStreak();
});