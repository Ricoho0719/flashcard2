document.addEventListener('DOMContentLoaded', () => {
    /**
     * Simplified View Saved Flashcards
     * This is a streamlined version focusing on core navigation functionality
     */
    
    // DOM Elements
    const cardContainer = document.getElementById('card-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noSavedCards = document.getElementById('no-saved-cards');
    const currentCardEl = document.getElementById('current-card');
    const totalCardsEl = document.getElementById('total-cards');
    const frontImage = document.getElementById('front-image');
    const backImage = document.getElementById('back-image');
    const card = document.querySelector('.card');
    const topicFilter = document.getElementById('topic-filter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const flipBtn = document.getElementById('flip-btn');
    const gotoBtn = document.getElementById('goto-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const removeCardBtn = document.getElementById('remove-card-btn');
    const removeCardBtnBack = document.getElementById('remove-card-btn-back');
    const topicLabelFront = document.getElementById('topic-label-front');
    const topicLabelBack = document.getElementById('topic-label-back');
    
    console.log("DOM Elements initialized");
    console.log("Previous button:", prevBtn);
    console.log("Next button:", nextBtn);
    console.log("Card container:", cardContainer);
    
    // State variables
    let savedFlashcards = [];
    let filteredCards = [];
    let currentCardIndex = 0;
    let isShowingAnswer = false;
    let currentFilter = 'all';
    
    // Initialize with direct event listeners for navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        console.log("Previous button clicked");
        if (currentCardIndex > 0) {
          currentCardIndex--;
          console.log("Moving to card index:", currentCardIndex);
          updateCardDisplay();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        console.log("Next button clicked");
        if (currentCardIndex < filteredCards.length - 1) {
          currentCardIndex++;
          console.log("Moving to card index:", currentCardIndex);
          updateCardDisplay();
        }
      });
    }
    
    // Topic filter event
    if (topicFilter) {
      topicFilter.addEventListener('change', function() {
        currentFilter = topicFilter.value;
        console.log("Topic filter changed to:", currentFilter);
        filterAndDisplayCards();
      });
    }
    
    // Flip card event
    if (cardContainer) {
      cardContainer.addEventListener('click', function(e) {
        if (e.target.closest('#remove-card-btn') || e.target.closest('#remove-card-btn-back')) {
          return;
        }
        flipCard();
      });
    }
    
    if (flipBtn) {
      flipBtn.addEventListener('click', flipCard);
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        console.log("Refresh button clicked");
        loadSavedFlashcards();
      });
    }
    
    if (gotoBtn) {
      gotoBtn.addEventListener('click', function() {
        const maxCard = filteredCards.length;
        if (maxCard === 0) return;
        
        const cardNum = prompt(`Enter card number (1-${maxCard}):`, currentCardIndex + 1);
        if (cardNum !== null) {
          const parsedNum = parseInt(cardNum.trim());
          if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= maxCard) {
            currentCardIndex = parsedNum - 1;
            updateCardDisplay();
          }
        }
      });
    }
    
    function flipCard() {
      console.log("Flip card triggered");
      if (!card || filteredCards.length === 0) return;
      
      if (!isShowingAnswer) {
        card.classList.add('flipped');
        isShowingAnswer = true;
      } else {
        card.classList.remove('flipped');
        isShowingAnswer = false;
      }
    }
    
    function loadSavedFlashcards() {
      console.log("Loading saved flashcards...");
      if (loadingIndicator) loadingIndicator.classList.remove('hidden');
      if (cardContainer) cardContainer.classList.add('hidden');
      if (noSavedCards) noSavedCards.classList.add('hidden');
      
      // Simple version: just use localStorage
      try {
        const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
        console.log("Raw saved flashcards:", localSaved);
        
        savedFlashcards = Object.entries(localSaved).map(([key, id]) => {
          const [topicName, cardIndex] = key.split('_');
          return {
            id: id,
            topic: topicName,
            card_index: parseInt(cardIndex),
            saved_at: new Date().toISOString()
          };
        });
        
        console.log("Processed saved flashcards:", savedFlashcards);
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        
        // Filter and display cards
        filterAndDisplayCards();
        
      } catch (err) {
        console.error("Error loading saved cards:", err);
        savedFlashcards = [];
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        
        // Show no saved cards message
        if (noSavedCards) noSavedCards.classList.remove('hidden');
      }
    }
    
    function filterAndDisplayCards() {
      console.log("Filtering cards with filter:", currentFilter);
      
      // Filter cards based on topic
      if (currentFilter === 'all') {
        filteredCards = [...savedFlashcards];
      } else {
        filteredCards = savedFlashcards.filter(card => card.topic === currentFilter);
      }
      
      console.log("Filtered to", filteredCards.length, "cards");
      
      // Update total count
      if (totalCardsEl) {
        totalCardsEl.textContent = filteredCards.length;
      }
      
      // Show appropriate containers
      if (filteredCards.length === 0) {
        console.log("No cards to display");
        if (noSavedCards) noSavedCards.classList.remove('hidden');
        if (cardContainer) cardContainer.classList.add('hidden');
        return;
      }
      
      console.log("Showing card container with", filteredCards.length, "cards");
      if (noSavedCards) noSavedCards.classList.add('hidden');
      if (cardContainer) cardContainer.classList.remove('hidden');
      
      // Reset index if needed
      if (currentCardIndex >= filteredCards.length) {
        currentCardIndex = 0;
      }
      
      // Display current card
      updateCardDisplay();
    }
    
    function updateCardDisplay() {
      console.log("Updating card display for index:", currentCardIndex);
      
      if (!filteredCards || filteredCards.length === 0) {
        console.warn("No cards to display");
        return;
      }
      
      // Reset card to question side
      if (isShowingAnswer) {
        card.classList.remove('flipped');
        isShowingAnswer = false;
      }
      
      // Get current card data
      const currentCard = filteredCards[currentCardIndex];
      console.log("Current card:", currentCard);
      
      // Update card counter
      if (currentCardEl) {
        currentCardEl.textContent = currentCardIndex + 1;
      }
      
      // Update navigation button states with visual indicators
      if (prevBtn) {
        if (currentCardIndex === 0) {
          prevBtn.setAttribute('disabled', 'disabled');
          prevBtn.classList.add('opacity-50');
        } else {
          prevBtn.removeAttribute('disabled');
          prevBtn.classList.remove('opacity-50');
        }
      }
      
      if (nextBtn) {
        if (currentCardIndex === filteredCards.length - 1) {
          nextBtn.setAttribute('disabled', 'disabled');
          nextBtn.classList.add('opacity-50');
        } else {
          nextBtn.removeAttribute('disabled');
          nextBtn.classList.remove('opacity-50');
        }
      }
      
      // Load card images
      loadCardImages(currentCard);
      
      // Update topic labels
      if (topicLabelFront) {
        topicLabelFront.textContent = currentCard.topic.charAt(0).toUpperCase() + currentCard.topic.slice(1);
      }
      
      if (topicLabelBack) {
        topicLabelBack.textContent = currentCard.topic.charAt(0).toUpperCase() + currentCard.topic.slice(1);
      }
    }
    
    function loadCardImages(cardData) {
      console.log("Loading images for card:", cardData);
      
      // Show loading state
      frontImage.style.opacity = 0;
      backImage.style.opacity = 0;
      
      // Remove existing spinner
      const existingSpinner = document.getElementById('loading-spinner');
      if (existingSpinner) existingSpinner.remove();
      
      // Show loading spinner
      frontImage.insertAdjacentHTML('afterend', '<div id="loading-spinner" class="loading-spinner mx-auto"></div>');
      const loadingSpinner = document.getElementById('loading-spinner');
      
      // Determine paths based on topic
      const topic = cardData.topic;
      const cardIndex = parseInt(cardData.card_index);
      
      let questionImagePath, answerImagePath;
      
      if (topic === 'electricity') {
        questionImagePath = `./NewPhys_Electricity/${cardIndex * 2 + 1}.png`;
        answerImagePath = `./NewPhys_Electricity/${cardIndex * 2 + 2}.png`;
      } else if (topic === 'mechanics') {
        questionImagePath = `./mechanics/${cardIndex * 2 + 1}.jpg`;
        answerImagePath = `./mechanics/${cardIndex * 2 + 2}.jpg`;
      } else if (topic === 'materials') {
        questionImagePath = `./material/${cardIndex * 2 + 1}.jpg`;
        answerImagePath = `./material/${cardIndex * 2 + 2}.jpg`;
      } else if (topic === 'waves') {
        questionImagePath = `./waves/${cardIndex * 2 + 1}.jpg`;
        answerImagePath = `./waves/${cardIndex * 2 + 2}.jpg`;
      } else if (topic === 'photon') {
        questionImagePath = `./photon/${cardIndex * 2 + 1}.jpg`;
        answerImagePath = `./photon/${cardIndex * 2 + 2}.jpg`;
      } else {
        questionImagePath = `./${topic}/${cardIndex * 2 + 1}.jpg`;
        answerImagePath = `./${topic}/${cardIndex * 2 + 2}.jpg`;
      }
      
      console.log("Question image path:", questionImagePath);
      console.log("Answer image path:", answerImagePath);
      
      // Set up load handlers
      frontImage.onload = () => {
        if (loadingSpinner) loadingSpinner.remove();
        frontImage.style.opacity = 1;
        console.log("Front image loaded successfully");
      };
      
      backImage.onload = () => {
        backImage.style.opacity = 1;
        console.log("Back image loaded successfully");
      };
      
      frontImage.onerror = () => {
        console.error("Failed to load question image");
        if (loadingSpinner) loadingSpinner.remove();
        frontImage.src = "placeholder.png";
        frontImage.style.opacity = 1;
      };
      
      backImage.onerror = () => {
        console.error("Failed to load answer image");
        backImage.src = "placeholder.png";
        backImage.style.opacity = 1;
      };
      
      // Set image sources
      frontImage.src = questionImagePath;
      backImage.src = answerImagePath;
    }
    
    // Initialize by loading saved flashcards
    console.log("Initializing view-saved.js...");
    loadSavedFlashcards();
  });