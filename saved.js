// saved.js - Client-side functionality for saved flashcards

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const savedCardsContainer = document.getElementById('saved-cards-container');
  const noSavedCards = document.getElementById('no-saved-cards');
  const topicFilter = document.getElementById('topic-filter');
  const sortOrder = document.getElementById('sort-order');
  const refreshButton = document.getElementById('refresh-saved');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  
  // State
  let savedFlashcards = [];
  let currentFilter = 'all';
  let currentSort = 'newest';
  
  // Initialize
  function init() {
    // Apply theme preference
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Load saved flashcards
    loadSavedFlashcards();
    
    // Set up event listeners
    setupEventListeners();
  }
  
  function setupEventListeners() {
    // Filter change
    if (topicFilter) {
      topicFilter.addEventListener('change', () => {
        currentFilter = topicFilter.value;
        renderSavedCards();
      });
    }
    
    // Sort change
    if (sortOrder) {
      sortOrder.addEventListener('change', () => {
        currentSort = sortOrder.value;
        renderSavedCards();
      });
    }
    
    // Refresh button
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        loadSavedFlashcards();
        showNotification("Refreshed saved flashcards");
      });
    }
    
    // Theme toggle
    if (toggleThemeBtn) {
      toggleThemeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
    }
  }
  
  function loadSavedFlashcards() {
    // Show loading state
    if (savedCardsContainer) {
      savedCardsContainer.innerHTML = `
        <div class="col-span-full">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center">
            <div class="text-center">
              <span class="material-icons text-gray-400 dark:text-gray-500 text-6xl mb-4">bookmark</span>
              <p class="text-gray-600 dark:text-gray-400">Loading saved cards...</p>
            </div>
          </div>
        </div>
      `;
    }
    
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
          renderSavedCards();
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
  }
  
  function loadSavedFlashcardsFromLocalStorage() {
    try {
      const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
      console.log('Raw localStorage data:', localSaved);
      
      if (Object.keys(localSaved).length === 0) {
        console.log('No saved flashcards found in localStorage');
        savedFlashcards = [];
        renderSavedCards();
        return;
      }
      
      savedFlashcards = Object.entries(localSaved).map(([key, id]) => {
        // Parse topic_index format
        const [topicName, cardIndex] = key.split('_');
        return {
          id: id,
          topic: topicName,
          card_index: parseInt(cardIndex),
          saved_at: new Date().toISOString() // Placeholder date
        };
      });
      
      console.log('Processed localStorage data:', savedFlashcards);
      renderSavedCards();
    } catch (err) {
      console.error('Error loading local saved cards:', err);
      savedFlashcards = [];
      renderSavedCards();
    }
  }
  
  function renderSavedCards() {
    if (!savedCardsContainer) return;
    
    console.log('Rendering saved cards, count:', savedFlashcards.length);
    
    // Filter cards
    let filteredCards = [...savedFlashcards];
    if (currentFilter !== 'all') {
      filteredCards = filteredCards.filter(card => card.topic === currentFilter);
    }
    
    console.log('After filtering, count:', filteredCards.length);
    
    // Sort cards
    if (currentSort === 'newest') {
      filteredCards.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
    } else if (currentSort === 'oldest') {
      filteredCards.sort((a, b) => new Date(a.saved_at || 0) - new Date(b.saved_at || 0));
    } else if (currentSort === 'topic') {
      filteredCards.sort((a, b) => {
        if (a.topic === b.topic) {
          return parseInt(a.card_index || 0) - parseInt(b.card_index || 0);
        }
        return (a.topic || '').localeCompare(b.topic || '');
      });
    }
    
    // Show "no cards" message if needed
    if (filteredCards.length === 0) {
      savedCardsContainer.innerHTML = '';
      if (noSavedCards) {
        noSavedCards.classList.remove('hidden');
      }
      return;
    }
    
    // Hide "no cards" message
    if (noSavedCards) {
      noSavedCards.classList.add('hidden');
    }
    
    // Render cards
    savedCardsContainer.innerHTML = filteredCards.map(card => {
      // Process card data, handling both server and local storage formats
      const topicName = (card.topic || '').charAt(0).toUpperCase() + (card.topic || '').slice(1);
      const cardIndex = card.card_index !== undefined ? card.card_index : 0;
      const cardDate = card.saved_at ? new Date(card.saved_at).toLocaleDateString() : 'Unknown date';
      const cardId = card.id !== undefined ? card.id : `${card.topic}_${cardIndex}`;
      
      // Determine topic color
      let colorClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      switch(card.topic) {
        case 'mechanics':
          colorClass = 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200';
          break;
        case 'materials':
          colorClass = 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200';
          break;
        case 'electricity':
          colorClass = 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200';
          break;
        case 'waves':
          colorClass = 'bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-200';
          break;
        case 'photon':
          colorClass = 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200';
          break;
      }
      
      return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <span class="${colorClass} text-xs px-2 py-1 rounded-full">${topicName}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">Card ${parseInt(cardIndex) + 1}</span>
            </div>
            <button class="unsave-btn text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" data-id="${cardId}">
              <span class="material-icons text-yellow-500">bookmark</span>
            </button>
          </div>
          <div class="p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Saved on ${cardDate}</p>
            <a href="flashcards.html?topic=${card.topic}&card=${cardIndex}" class="block w-full bg-indigo-600 text-white text-center my-1 py-2 px-4 rounded-lg hover:bg-indigo-700 transition">
              View Card
            </a>
            <a href="view-saved.html?filter=${card.topic}" class="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700 transition">
             View in Card Mode
            </a>
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners for unsave buttons
    document.querySelectorAll('.unsave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default button behavior
        const id = btn.dataset.id;
        console.log('Unsave button clicked for ID:', id);
        unsaveCard(id);
      });
    });
  }
  
  function unsaveCard(id) {
    console.log(`Removing saved card with id: ${id}`);
    
    // Try server first if ID is numeric and we have a token
    const token = localStorage.getItem('authToken');
    const isNumericId = /^\d+$/.test(id);
    
    if (token && isNumericId) {
      // ID is a numeric server ID
      fetch(`/api/saved-flashcards/${id}`, {
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
        // Remove from savedFlashcards array
        savedFlashcards = savedFlashcards.filter(card => card.id.toString() !== id);
        renderSavedCards();
        showNotification("Flashcard removed from saved items");
      })
      .catch(err => {
        console.error('Error unsaving card from server:', err);
        // Try local fallback
        unsaveCardLocally(id);
      });
    } else {
      // ID is a topic_index combination or no token
      unsaveCardLocally(id);
    }
  }
  
  function unsaveCardLocally(id) {
    try {
      if (id.includes('_')) {
        // ID is topic_index
        const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
        console.log('Before local delete:', localSaved);
        delete localSaved[id];
        localStorage.setItem('savedFlashcards', JSON.stringify(localSaved));
        console.log('After local delete:', JSON.parse(localStorage.getItem('savedFlashcards') || '{}'));
        
        // Remove from savedFlashcards array
        const [topic, index] = id.split('_');
        savedFlashcards = savedFlashcards.filter(card => 
          !(card.topic === topic && card.card_index.toString() === index)
        );
      } else {
        // ID is numeric but we're using local storage
        // Find card by id and remove from both arrays and localStorage
        const cardToRemove = savedFlashcards.find(card => card.id.toString() === id);
        if (cardToRemove) {
          const key = `${cardToRemove.topic}_${cardToRemove.card_index}`;
          const localSaved = JSON.parse(localStorage.getItem('savedFlashcards') || '{}');
          delete localSaved[key];
          localStorage.setItem('savedFlashcards', JSON.stringify(localSaved));
          
          savedFlashcards = savedFlashcards.filter(card => card.id.toString() !== id);
        }
      }
      
      renderSavedCards();
      showNotification("Flashcard removed from saved items");
    } catch (e) {
      console.error('Error with local unsave:', e);
      showNotification("Failed to remove flashcard", "error");
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
  
  // Initialize the page
  init();
});