document.addEventListener('DOMContentLoaded', () => {
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
  
  // State variables
  let savedFlashcards = [];
  let filteredCards = [];
  let currentCardIndex = 0;
  let isShowingAnswer = false;
  let currentFilter = 'all';
  
  // Check URL parameters for filter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('filter')) {
      currentFilter = urlParams.get('filter');
      if (topicFilter) {
          topicFilter.value = currentFilter;
      }
      console.log("Applied filter from URL:", currentFilter);
  }
  
  // Initialize event listeners
  function setupEventListeners() {
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
      
      // Flip card event - avoid flip when clicking remove button
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
              showNotification("Refreshed saved flashcards");
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
      
      // Setup remove buttons
      if (removeCardBtn) {
          removeCardBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              removeCurrentCard();
          });
      }
      
      if (removeCardBtnBack) {
          removeCardBtnBack.addEventListener('click', function(e) {
              e.stopPropagation();
              removeCurrentCard();
          });
      }
      
      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
          if (filteredCards.length === 0) return;
          
          switch(e.key) {
              case 'ArrowLeft':
                  if (currentCardIndex > 0) {
                      currentCardIndex--;
                      updateCardDisplay();
                  }
                  break;
              case 'ArrowRight':
                  if (currentCardIndex < filteredCards.length - 1) {
                      currentCardIndex++;
                      updateCardDisplay();
                  }
                  break;
              case ' ':
                  flipCard();
                  break;
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
      
      // Try to load from server first
      const token = localStorage.getItem('authToken');
      if (token) {
          console.log('Using auth token to fetch saved flashcards from server');
          
          fetch('/api/saved-flashcards', {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          })
          .then(res => {
              if (!res.ok) {
                  return res.text().then(text => {
                      console.error('Server returned non-OK response:', text);
                      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
                  });
              }
              return res.json();
          })
          .then(data => {
              // Check if data is an array
              if (Array.isArray(data)) {
                  savedFlashcards = data;
                  console.log("Loaded saved flashcards from server:", savedFlashcards);
                  
                  // Hide loading indicator
                  if (loadingIndicator) loadingIndicator.classList.add('hidden');
                  
                  // Filter and display cards
                  filterAndDisplayCards();
              } else {
                  console.error('Server returned invalid data format:', data);
                  throw new Error('Invalid data format received from server');
              }
          })
          .catch(err => {
              console.error('Error loading saved cards from server:', err);
              // Fallback to local storage
              loadSavedFlashcardsFromLocalStorage();
          });
      } else {
          // No token, use local storage
          loadSavedFlashcardsFromLocalStorage();
      }
  }
  
  function loadSavedFlashcardsFromLocalStorage() {
      console.log("Attempting to load from localStorage...");
      try {
          const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
          console.log("Raw localStorage data:", localSaved);
          
          if (Object.keys(localSaved).length === 0) {
              console.log('No saved flashcards found in localStorage');
              savedFlashcards = [];
              
              // Hide loading indicator
              if (loadingIndicator) loadingIndicator.classList.add('hidden');
              
              // Show no saved cards message
              if (noSavedCards) noSavedCards.classList.remove('hidden');
              return;
          }
          
          savedFlashcards = Object.entries(localSaved).map(([key, id]) => {
              const [topicName, cardIndex] = key.split('_');
              return {
                  id: id || key, // Use key as fallback ID
                  topic: topicName,
                  card_index: parseInt(cardIndex),
                  saved_at: new Date().toISOString() // Placeholder date
              };
          });
          
          console.log("Processed localStorage data:", savedFlashcards);
          
          // Hide loading indicator
          if (loadingIndicator) loadingIndicator.classList.add('hidden');
          
          // Filter and display cards
          filterAndDisplayCards();
          
      } catch (err) {
          console.error("Error loading local saved cards:", err);
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
      const topicName = currentCard.topic.charAt(0).toUpperCase() + currentCard.topic.slice(1);
      
      if (topicLabelFront) {
          topicLabelFront.textContent = topicName;
      }
      
      if (topicLabelBack) {
          topicLabelBack.textContent = topicName;
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
          frontImage.style.opacity = 1;
          
          // Create placeholder content
          const placeholderHtml = `
              <div class="placeholder-img">
                  <div>
                      <span class="material-icons text-4xl mb-2">broken_image</span>
                      <p>Image not found</p>
                      <p class="text-sm mt-2">${questionImagePath}</p>
                  </div>
              </div>
          `;
          const placeholder = document.createElement('div');
          placeholder.innerHTML = placeholderHtml;
          
          frontImage.parentNode.insertBefore(placeholder.firstElementChild, frontImage.nextSibling);
          frontImage.style.display = 'none';
      };
      
      backImage.onerror = () => {
          console.error("Failed to load answer image");
          backImage.style.opacity = 1;
          
          // Create placeholder content
          const placeholderHtml = `
              <div class="placeholder-img">
                  <div>
                      <span class="material-icons text-4xl mb-2">broken_image</span>
                      <p>Image not found</p>
                      <p class="text-sm mt-2">${answerImagePath}</p>
                  </div>
              </div>
          `;
          const placeholder = document.createElement('div');
          placeholder.innerHTML = placeholderHtml;
          
          backImage.parentNode.insertBefore(placeholder.firstElementChild, backImage.nextSibling);
          backImage.style.display = 'none';
      };
      
      // Clear any previous placeholders
      const placeholders = document.querySelectorAll('.placeholder-img');
      placeholders.forEach(p => p.remove());
      
      // Reset image display
      frontImage.style.display = '';
      backImage.style.display = '';
      
      // Set image sources
      frontImage.src = questionImagePath;
      backImage.src = answerImagePath;
  }
  
  function removeCurrentCard() {
      if (!filteredCards || filteredCards.length === 0) return;
      
      const currentCard = filteredCards[currentCardIndex];
      if (!currentCard) return;
      
      // Determine the card ID
      const cardId = currentCard.id;
      console.log(`Removing saved card with id: ${cardId}`);
      
      // Try server first if ID is numeric and we have a token
      const token = localStorage.getItem('authToken');
      const isNumericId = /^\d+$/.test(cardId);
      
      if (token && isNumericId) {
          // ID is a numeric server ID
          fetch(`/api/saved-flashcards/${cardId}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          })
          .then(res => {
              if (!res.ok) throw new Error(`Failed to unsave from server: ${res.status}`);
              return res.json();
          })
          .then(data => {
              console.log('Server response for delete:', data);
              removeCardAndUpdateDisplay(cardId);
              showNotification("Flashcard removed from saved items");
          })
          .catch(err => {
              console.error('Error unsaving card from server:', err);
              // Try local fallback
              removeCardLocally(cardId);
          });
      } else {
          // ID is a topic_index combination or no token
          removeCardLocally(cardId);
      }
  }
  
  function removeCardLocally(id) {
      try {
          const cardToRemove = filteredCards[currentCardIndex];
          
          if (id.includes('_') || !isNaN(parseInt(id))) {
              // ID is topic_index or numeric
              let localKey;
              
              if (id.includes('_')) {
                  localKey = id; // ID is already in topic_index format
              } else {
                  // Find the card in savedFlashcards
                  const card = savedFlashcards.find(card => card.id && card.id.toString() === id.toString());
                  if (card) {
                      localKey = `${card.topic}_${card.card_index}`;
                  }
              }
              
              if (localKey) {
                  const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
                  console.log('Before local delete:', localSaved);
                  delete localSaved[localKey];
                  localStorage.setItem('savedFlashcards', JSON.stringify(localSaved));
                  console.log('After local delete:', JSON.parse(localStorage.getItem('savedFlashcards') || '{}'));
              }
          }
          
          removeCardAndUpdateDisplay(id);
          showNotification("Flashcard removed from saved items");
      } catch (e) {
          console.error('Error with local unsave:', e);
          showNotification("Failed to remove flashcard", "error");
      }
  }
  
  function removeCardAndUpdateDisplay(id) {
      // Remove from arrays
      savedFlashcards = savedFlashcards.filter(card => 
          card.id.toString() !== id.toString()
      );
      
      // Refilter and update display
      const wasLastCard = currentCardIndex === filteredCards.length - 1;
      
      filterAndDisplayCards();
      
      // Adjust current index if needed
      if (filteredCards.length > 0) {
          if (wasLastCard || currentCardIndex >= filteredCards.length) {
              currentCardIndex = filteredCards.length - 1;
          }
          updateCardDisplay();
      }
  }
  
  function showNotification(message, type = 'success') {
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
          <span class="material-icons mr-2 text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'indigo'}-500">${icon}</span>
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
  
  // Initialize
  setupEventListeners();
  loadSavedFlashcards();
});