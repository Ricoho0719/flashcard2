// script.js - Topic selection page functionality with fixed completion tracking and subject-based access
document.addEventListener('DOMContentLoaded', () => {
  "use strict";

  // Game state variables
  let currentUser = null;
  let gameState = {
    points: 0,
    level: 1,
    xp: 0,
    streak: 0,
    topicProgress: {},
    dailyChallenge: {
      completed: false,
      target: 10,
      progress: 0,
      lastDate: ''
    },
    settings: {
      sound: true,
      darkMode: false,
    }
  };

    // Add subject-related variables
    let userSubjects = [];
    let currentSubjectId = null;
    let subjectTopicsCache = {}; 

  // Topic configuration
  const topicsConfig = {
    mechanics: { name: "Mechanics", total: 51 },
    materials: { name: "Materials", total: 74 },
    electricity: { name: "Electricity", total: 35 },
    waves: { name: "Waves", total: 31 },
    photon: { name: "Photon", total: 36 }
  };

  // Track which topics are accessible to the current user
  let accessibleTopics = { ...topicsConfig };

  // DOM Elements
  const loginOverlay = document.getElementById("login-overlay");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const userInfo = document.getElementById("user-info");
  const userAvatar = document.getElementById("user-avatar");
  const userNameDisplay = document.getElementById("user-name");
  const userLevelDisplay = document.getElementById("user-level");
  const logoutButton = document.getElementById("logout-button");
  const toggleThemeBtn = document.getElementById("toggle-theme");
  const gameStats = document.getElementById("game-stats");
  const pointsDisplay = document.getElementById("points-display");
  const levelDisplay = document.getElementById("level-display");
  const streakDisplay = document.getElementById("streak-display");
  const challengeProgressBar = document.getElementById("challenge-progress-bar");
  const challengeProgressCount = document.getElementById("challenge-progress-count");
  const leaderboardTable = document.getElementById("leaderboard-table");
  const refreshLeaderboardBtn = document.getElementById("refresh-leaderboard");
  const subjectSelectorContainer = document.createElement('div');
  subjectSelectorContainer.className = 'container mx-auto px-4 mb-4';
  subjectSelectorContainer.id = 'subject-selector-container';
  subjectSelectorContainer.style.display = 'none'; // Initially hidden
  
  const subjectSelector = document.createElement('select');
  subjectSelector.id = 'subject-selector';
  subjectSelector.className = 'w-full p-2 border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  
  document.querySelector('main').insertBefore(subjectSelectorContainer, document.querySelector('main').firstChild);
  subjectSelectorContainer.appendChild(subjectSelector);

  // Sound effects
  const sounds = {
    click: new Audio('sounds/click.mp3'),
    success: new Audio('sounds/success.mp3')
  };

  function init() {
    console.log("Initializing application...");
    
    // Check if user is already logged in
    const token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("currentUser");
    
    if (token && savedUser) {
      currentUser = JSON.parse(savedUser);
      hideLoginOverlay();
      loadUserSubjects();
      loadGameState();
      updateUserInterface();
      console.log("User session loaded from localStorage");
    } else {
      showLoginOverlay();
    }
    
    setupEventListeners();
    checkDailyChallenge();
    populateLeaderboard();
    
  }

    // Add function to load user subjects
    function loadUserSubjects() {
        try {
          // Load subjects from localStorage
          const storedSubjects = localStorage.getItem('userSubjects');
          
          if (storedSubjects) {
            userSubjects = JSON.parse(storedSubjects);
            console.log("Loaded user subjects:", userSubjects);
            
            // If user has subjects, set up the subject selector
            if (userSubjects.length > 0) {
              setupSubjectSelector();
              
              // Set default subject (first one)
              currentSubjectId = userSubjects[0].id;
              
              // Load topics for first subject
              loadSubjectTopics(currentSubjectId);
            } else {
              console.log("User has no subjects");
            }
          } else {
            console.log("No stored subject information found");
          }
        } catch (error) {
          console.error("Error loading user subjects:", error);
        }
      }
    
      // Setup subject selector dropdown
      function setupSubjectSelector() {
        // Only show selector if user has more than one subject
        if (userSubjects.length <= 1) {
          subjectSelectorContainer.style.display = 'none';
          return;
        }
        
        // Clear existing options
        subjectSelector.innerHTML = '';
        
        // Add options for each subject
        userSubjects.forEach(subject => {
          const option = document.createElement('option');
          option.value = subject.id;
          option.textContent = subject.name;
          subjectSelector.appendChild(option);
        });
        
        // Show the selector
        subjectSelectorContainer.style.display = 'block';
        
        // Add change event listener
        subjectSelector.addEventListener('change', handleSubjectChange);
      }
    
      // Handle subject change
      function handleSubjectChange() {
        const selectedSubjectId = parseInt(subjectSelector.value);
        
        if (selectedSubjectId !== currentSubjectId) {
          currentSubjectId = selectedSubjectId;
          loadSubjectTopics(currentSubjectId);
        }
      }
    
      function loadSubjectTopics(subjectId) {
        // Check cache first
        if (subjectTopicsCache[subjectId]) {
          displayTopics(subjectTopicsCache[subjectId], subjectId);
          return;
        }
        
        // Get auth token
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error("No auth token found");
          return;
        }
        
        console.log(`Fetching topics for subject ID: ${subjectId}`);
        
        // Show loading state
        const topicsContainer = document.querySelector('.grid');
        topicsContainer.innerHTML = `
          <div class="col-span-full text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p class="mt-2 text-gray-600">Loading topics...</p>
          </div>
        `;
        
        // Fetch topics from the API
        fetch(`/api/flashcards/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          console.log(`Response status: ${response.status}`);
          if (!response.ok) {
            // Try to get more information about the error
            return response.text().then(text => {
              console.error(`Error response: ${text}`);
              throw new Error(`Failed to fetch topics for subject ${subjectId}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log(`Loaded topics for subject ${subjectId}:`, data);
          
          // Cache the topics
          subjectTopicsCache[subjectId] = data.topics;
          
          // Display the topics
          displayTopics(data.topics, subjectId);
        })
        .catch(error => {
          console.error("Error loading subject topics:", error);
          
          // Show error state
          topicsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
              <span class="material-icons text-red-500 text-4xl">error</span>
              <p class="mt-2 text-red-500">Failed to load topics. Please try again.</p>
              <p class="text-sm text-gray-500 mt-1">${error.message}</p>
            </div>
          `;
        });
      }

      // Generate color scheme for a subject
  function getSubjectColorScheme(subjectId) {
    // Basic color schemes by subject
    const colorSchemes = {
      1: { // Physics
        primaryColors: [
          'bg-lavender',
          'bg-mint',
          'bg-peach',
          'bg-sky',
          'bg-rose'
        ],
        bgColor: 'bg-white',
        textColor: [
          'text-lavender',
          'text-mint',
          'text-peach',
          'text-sky',
          'text-rose'
        ],
        progressColor: 'bg-white'
      },
      2: { // Chemistry
        primaryColors: [
          'bg-lavender',
          'bg-mint',
          'bg-peach',
          'bg-sky',
          'bg-rose',
          'bg-sage',
          'bg-apricot'
        ],
        bgColor: 'bg-white',
        textColor: [
          'text-lavender',
          'text-mint',
          'text-peach',
          'text-sky',
          'text-rose',
          'text-sage',
          'text-apricot'
        ],
        progressColor: 'bg-white'
      },
      3: { // Biology
        primaryColors: [
          'bg-lavender',
          'bg-mint',
          'bg-peach',
          'bg-sky',
          'bg-rose',
          'bg-sage',
          'bg-apricot',
          'bg-periwinkle',
          'bg-aqua',
          'bg-lilac'
        ],
        bgColor: 'bg-white',
        textColor: [
          'text-lavender',
          'text-mint',
          'text-peach',
          'text-sky',
          'text-rose',
          'text-sage',
          'text-apricot',
          'text-periwinkle',
          'text-aqua',
          'text-lilac'
        ],
        progressColor: 'bg-white'
      }
    };
    
    // Default colors if subject not found
    return colorSchemes[subjectId] || {
      primaryColors: ['bg-lavender'],
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-900',
      progressColor: 'bg-gray-500'
    };
  }

    // Display topics
    function displayTopics(topics, subjectId) {
        const topicsContainer = document.querySelector('.grid');
        
        // Clear existing topics
        topicsContainer.innerHTML = '';
        
        if (!topics || topics.length === 0) {
          // Show no topics message
          topicsContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
              <span class="material-icons text-gray-500 text-4xl">info</span>
              <p class="mt-2 text-gray-600">No topics available for this subject.</p>
            </div>
          `;
          return;
        }
        
        // Get color scheme for this subject
        const colorScheme = getSubjectColorScheme(subjectId);
        
        // Generate topic cards
        topics.forEach((topic, index) => {
          // Get topic icon and description
          const { icon, description } = getTopicMetadata(topic, subjectId);
          
          // Get color for this topic (cycle through available colors)
          const colorIndex = index % colorScheme.primaryColors.length;
          const gradientClass = colorScheme.primaryColors[colorIndex];
          
          // Create topic card
          const topicCard = document.createElement('a');
          topicCard.href = `flashcards.html?topic=${topic}&subjectId=${subjectId}`;
          topicCard.className = `topic-card bg-gradient-to-r ${gradientClass}`;
          topicCard.setAttribute('data-topic', topic);
          topicCard.setAttribute('data-subject', subjectId);
          
          // Set inner HTML for topic card
          topicCard.innerHTML = `
            <div class="topic-card-inner">
              <div class="topic-icon ${colorScheme.bgColor} ${colorScheme.textColor[colorIndex]}">
                <span class="material-icons">${icon}</span>
              </div>
              <div class="topic-content">
                <h3 class="${colorScheme.textColor[colorIndex]}">${formatTopicName(topic)}</h3>
                <p class="${colorScheme.textColor[colorIndex]}">${description}</p>
                <div class="topic-stats">
                  <div class="topic-stat ${colorScheme.textColor[colorIndex]} opacity-80">
                    <span class="material-icons">description</span>
                    <span id="${topic}-total-cards">0</span> cards
                  </div>
                  <div class="topic-stat ${colorScheme.textColor[colorIndex]} opacity-80">
                    <span class="material-icons">check_circle</span>
                    <span id="${topic}-cards-completed">0</span> completed
                  </div>
                </div>
                <div class="topic-progress-bar bg-white/30">
                  <div class="topic-progress-fill ${colorScheme.progressColor}" style="width: 0%"></div>
                </div>
              </div>
            </div>
          `;
          
          // Add to container
          topicsContainer.appendChild(topicCard);
        });
        
        // Add random topic card
        const randomCard = document.createElement('a');
        randomCard.href = `flashcards.html?topic=random&subjectId=${subjectId}`;
        randomCard.className = 'topic-card bg-gray';
        randomCard.innerHTML = `
          <div class="topic-card-inner">
            <div class="topic-icon bg-white text-gray">
              <span class="material-icons">shuffle</span>
            </div>
            <div class="topic-content">
              <h3 class="text-white">Random</h3>
              <p class="text-gray opacity-90">Mix all topics from this subject</p>
            </div>
          </div>
        `;
        topicsContainer.appendChild(randomCard);
        
        // Add saved cards option
        const savedCard = document.createElement('a');
        savedCard.href = 'saved.html';
        savedCard.className = 'topic-card bg-yellow-100';
        savedCard.innerHTML = `
          <div class="topic-card-inner">
            <div class="topic-icon bg-white text-yellow-700">
              <span class="material-icons">bookmark</span>
            </div>
            <div class="topic-content">
              <h3 class="text-white">Saved Cards</h3>
              <p class="text-yellow-700 opacity-90">Review your saved flashcards</p>
            </div>
          </div>
        `;
        topicsContainer.appendChild(savedCard);
        
        // Update topic progress
        updateTopicProgress();
      }
    
      // Helper to format topic name
      function formatTopicName(topic) {
        return topic
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    
      // Get topic metadata (icon and description)
      function getTopicMetadata(topic, subjectId) {
        // Default values
        let icon = 'school';
        let description = 'Study flashcards';
        
        // Topic-specific metadata
        const topicMeta = {
          // Physics (Subject 1)
          'mechanics': { icon: 'sports_basketball', description: 'Motion, forces, energy' },
          'materials': { icon: 'view_in_ar', description: 'Solids, elasticity, thermal' },
          'electricity': { icon: 'bolt', description: 'Currents and circuits' },
          'waves': { icon: 'waves', description: 'Interference, diffraction' },
          'photon': { icon: 'highlight', description: 'Quantum, light' },
          
          // Chemistry (Subject 2)
          'atomic_structure': { icon: 'blur_circular', description: 'Atoms, electrons, periodic table' },
          'bonding_and_structure': { icon: 'link', description: 'Chemical bonds and structures' },
          'chem_energetics': { icon: 'whatshot', description: 'Energy changes, thermodynamics' },
          'formulae_equations': { icon: 'functions', description: 'Chemical equations, stoichiometry' },
          'intermolecular_force': { icon: 'attractions', description: 'Molecular interactions' },
          'organic_chemistry_1': { icon: 'science', description: 'Carbon compounds, reactions' },
          'redox_chemistry_inorganic': { icon: 'change_circle', description: 'Oxidation, reduction, reactions' },
          
          // Biology (Subject 3)
          'biodiversity_and_conservation': { icon: 'eco', description: 'Species, conservation' },
          'biology_molecules': { icon: 'biotech', description: 'Proteins, carbohydrates, lipids' },
          'cardiovascular_disease': { icon: 'favorite', description: 'Heart and circulatory disorders' },
          'cell_divisions_and_fertilisation': { icon: 'table_chart', description: 'Mitosis, meiosis, reproduction' },
          'cell_ultrastructure': { icon: 'grain', description: 'Organelles, cell structure' },
          'dna_and_protein_synthesis': { icon: 'dns', description: 'Genetic code, translation' },
          'genetic_inheritance_disease': { icon: 'account_tree', description: 'Inheritance, genetic disorders' },
          'membrane_transport': { icon: 'swap_horiz', description: 'Diffusion, active transport' },
          'stem_cells_and_polygenicruterance': { icon: 'blur_on', description: 'Cell differentiation' },
          'use_of_plant_fibres_and_materials': { icon: 'grass', description: 'Plant structures and uses' },
          
          // Special
          'random': { icon: 'shuffle', description: 'Mix all topics' },
          'saved': { icon: 'bookmark', description: 'Your saved flashcards' }
        };
        
        // Return metadata for this topic, or default
        return topicMeta[topic] || { icon, description };
      }
    
      // Update topic progress
      function updateTopicProgress() {
        // Only if we have game state with topic progress
        if (!gameState || !gameState.topicProgress) return;
        
        // Update progress for each topic
        Object.keys(gameState.topicProgress).forEach(topic => {
          const completedEl = document.getElementById(`${topic}-cards-completed`);
          const totalCardsEl = document.getElementById(`${topic}-total-cards`);
          const progressFillEl = document.querySelector(`[data-topic="${topic}"] .topic-progress-fill`);
          
          if (!completedEl || !progressFillEl) return;
          
          const progress = gameState.topicProgress[topic];
          
          // Update completion count
          completedEl.textContent = progress.completed || 0;
          
          // Update total if available (otherwise leave whatever was set in HTML)
          if (totalCardsEl && progress.total) {
            totalCardsEl.textContent = progress.total;
          }
          
          // Update progress bar
          progressFillEl.style.width = `${progress.percentage || 0}%`;
        });
      }
      
  function filterAccessibleTopics() {
    // Default - allow access to all topics for admins
    if (currentUser && currentUser.isAdmin) {
      accessibleTopics = { ...topicsConfig };
      return;
    }
    
    // Always make random and saved topics accessible to everyone
    accessibleTopics = {
      random: { name: "Random" },
      saved: { name: "Saved Cards" }
    };
    
    // If user has no subjects, we've already set the basics
    if (!currentUser || !currentUser.subjects) {
      console.log("User has no subjects, limited access provided");
      return;
    }
    
    try {
      // Extract user subjects - handle all possible formats
      let userSubjects = [];
      
      if (typeof currentUser.subjects === 'string') {
        // Simple comma-separated string (like "AS Physics, A2 Biology")
        userSubjects = currentUser.subjects.split(/,\s*/).map(s => s.trim());
      } else if (Array.isArray(currentUser.subjects)) {
        // Array of objects or strings
        userSubjects = currentUser.subjects.map(s => typeof s === 'object' && s.name ? s.name : s);
      } else if (currentUser.subjects) {
        // Single subject as a string or object
        userSubjects = [typeof currentUser.subjects === 'object' && currentUser.subjects.name ? 
                      currentUser.subjects.name : currentUser.subjects];
      }
      
      console.log("User subjects:", userSubjects);
      
      // Map physics topics to subject names
      const topicToSubjectMap = {
        'mechanics': ['AS Physics', 'A2 Physics'],
        'materials': ['AS Physics', 'A2 Physics'],
        'electricity': ['AS Physics', 'A2 Physics'],
        'waves': ['AS Physics', 'A2 Physics'],
        'photon': ['AS Physics', 'A2 Physics']
      };
      
      // Add accessible topics based on user's subjects
      Object.keys(topicsConfig).forEach(topic => {
        // Skip random topic as it's already added
        if (topic === 'random') return;
        
        const requiredSubjects = topicToSubjectMap[topic] || [];
        
        // Check if user has any of the required subjects for this topic
        const hasAccess = userSubjects.some(subject => 
          requiredSubjects.some(requiredSubject => 
            typeof subject === 'string' && subject.includes(requiredSubject)
          )
        );
        
        if (hasAccess) {
          accessibleTopics[topic] = topicsConfig[topic];
        }
      });
      
      console.log("User has access to topics:", Object.keys(accessibleTopics));
    } catch (error) {
      console.error("Error in filterAccessibleTopics:", error);
      // On error, default to providing access to all topics
      accessibleTopics = { ...topicsConfig };
    }
  }
  
  // Event Listeners (update setupEventListeners)
  function setupEventListeners() {
    // Existing event listeners...
    
    // Add logout event to clear subject cache
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        // Clear subject cache on logout
        subjectTopicsCache = {};
        userSubjects = [];
        
        // Call original logout function
        handleLogout();
      });
    }
  }

  async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showLoginError("Please enter both username and password");
      return;
    }

    try {
      loginButton.innerHTML = '<span class="loading-spinner"></span> Logging in...';
      loginButton.disabled = true;
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      
      const result = await response.json();
      
      localStorage.setItem('authToken', result.token);
      currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Filter accessible topics based on user subjects
      filterAccessibleTopics();
      
      // Load game state from server or initialize new one
      if (result.gameState) {
        gameState = result.gameState;
      } else {
        initializeNewGameState();
      }
      
      saveGameState();
      hideLoginOverlay();
      updateUserInterface();
      
      usernameInput.value = "";
      passwordInput.value = "";
      loginError.classList.add("hidden");
      
      playSound('success');
      showNotification(`Welcome, ${currentUser.name}!`, 'success');
    } catch (error) {
      console.error("Login failed:", error);
      showLoginError("Invalid username or password");
    } finally {
      loginButton.innerHTML = "Log In";
      loginButton.disabled = false;
    }
  }

  function handleLogout() {
    // Save game state before logout
    saveGameState();
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    currentUser = null;
    
    // Reset accessible topics
    accessibleTopics = {};
    
    showLoginOverlay();
    showNotification("You have been logged out", "info");
  }

  function initializeNewGameState() {
    gameState = {
      points: 0,
      level: 1,
      xp: 0,
      streak: 0,
      topicProgress: {},
      dailyChallenge: {
        completed: false,
        target: 10,
        progress: 0,
        lastDate: new Date().toDateString()
      },
      settings: {
        sound: true,
        darkMode: document.documentElement.classList.contains('dark')
      }
    };
    
    // Initialize topic progress
    Object.keys(topicsConfig).forEach(topic => {
      gameState.topicProgress[topic] = { 
        completed: 0, 
        percentage: 0,
        total: topicsConfig[topic].total
      };
    });
  }

  function loadGameState() {
    // First check for saved topic-specific states to get accurate completion count
    Object.keys(topicsConfig).forEach(topic => {
      const savedStateKey = `flashcards_state_${topic}`;
      const savedState = localStorage.getItem(savedStateKey);
      
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.gameState && state.gameState.completedCards) {
            // Count completed cards for this topic
            const completedCount = Object.keys(state.gameState.completedCards).filter(
              cardId => cardId.startsWith(`${topic}_`)
            ).length;
            
            // Initialize topic progress if needed
            if (!gameState.topicProgress) {
              gameState.topicProgress = {};
            }
            
            if (!gameState.topicProgress[topic]) {
              gameState.topicProgress[topic] = {
                total: topicsConfig[topic].total
              };
            }
            
            // Update completion data
            gameState.topicProgress[topic].completed = completedCount;
            gameState.topicProgress[topic].percentage = Math.min(
              100, 
              Math.round((completedCount / topicsConfig[topic].total) * 100)
            );
          }
        } catch (error) {
          console.error(`Error parsing saved state for ${topic}:`, error);
        }
      }
    });
    
    // Now load the global game state
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        // Merge the saved state with the current state
        gameState = {
          ...gameState,
          points: parsedState.points || 0,
          level: parsedState.level || 1,
          xp: parsedState.xp || 0,
          streak: parsedState.streak || 0,
          dailyChallenge: parsedState.dailyChallenge || gameState.dailyChallenge,
          settings: parsedState.settings || gameState.settings,
        };
        
        // Merge topic progress, keeping our updated completed counts
        if (parsedState.topicProgress) {
          Object.keys(parsedState.topicProgress).forEach(topic => {
            if (!gameState.topicProgress[topic]) {
              gameState.topicProgress[topic] = parsedState.topicProgress[topic];
            } else {
              // Keep the completion count we calculated, but take other properties
              const completed = gameState.topicProgress[topic].completed;
              const percentage = gameState.topicProgress[topic].percentage;
              gameState.topicProgress[topic] = {
                ...parsedState.topicProgress[topic],
                completed,
                percentage
              };
            }
          });
        }
        
        console.log("Game state loaded:", gameState);
      } catch (error) {
        console.error("Error parsing saved game state:", error);
        initializeNewGameState();
      }
    } else {
      console.log("No saved game state found, initializing new state");
      initializeNewGameState();
    }
  }

  function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
    
    // If connected to server, sync game state there too
    syncGameStateWithServer();
  }

  async function syncGameStateWithServer() {
    if (!currentUser) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
      const response = await fetch('/api/save-game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gameState })
      });
      
      if (!response.ok) {
        console.warn("Failed to sync game state with server");
      }
    } catch (error) {
      console.error("Error syncing game state:", error);
    }
  }

  function hideLoginOverlay() {
    if (loginOverlay) {
      loginOverlay.classList.add("hidden");
    }
  }

  function showLoginOverlay() {
    if (loginOverlay) {
      loginOverlay.classList.remove("hidden");
    }
  }

  function showLoginError(message) {
    if (loginError) {
      loginError.textContent = message;
      loginError.classList.remove("hidden");
    }
  }

  function updateUserInterface() {
    // Update user display
    if (userInfo && currentUser) {
      userInfo.classList.remove("hidden");
      
      if (userNameDisplay) {
        userNameDisplay.textContent = currentUser.name;
      }
      
      if (userLevelDisplay) {
        userLevelDisplay.textContent = `Level ${gameState.level}`;
      }
      
      if (userAvatar) {
        // Set avatar based on user preference or default
        const avatar = gameState.settings.avatar || 'default';
        userAvatar.src = `avatars/${avatar}.png`;
        userAvatar.onerror = () => {
          userAvatar.src = 'avatars/default.png';
        };
      }
      
      // Display user subjects if available
      const userSubjectsEl = document.getElementById('user-subjects');
      if (userSubjectsEl && currentUser.subjects && currentUser.subjects.length > 0) {
        const subjectNames = currentUser.subjects.map(s => s.name).join(', ');
        userSubjectsEl.textContent = subjectNames;
        userSubjectsEl.parentElement.classList.remove('hidden');
      }
    }
    
    if (logoutButton) {
      logoutButton.classList.remove("hidden");
    }
    
    // Show game stats when logged in
    if (gameStats) {
      gameStats.classList.remove("hidden");
    }
    
    // Update game stats displays
    if (pointsDisplay) {
      pointsDisplay.textContent = gameState.points;
    }
    
    if (levelDisplay) {
      levelDisplay.textContent = gameState.level;
    }
    
    if (streakDisplay) {
      streakDisplay.textContent = gameState.streak;
    }
    
    // Apply user preferences
    if (gameState.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update daily challenge
    updateDailyChallengeUI();
    
    // Update topic cards progress
    updateTopicCards();
  }

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    
    // Update game state
    gameState.settings.darkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', gameState.settings.darkMode);
    
    saveGameState();
    playSound('click');
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
      
      saveGameState();
    }
    
    updateDailyChallengeUI();
  }

  function updateDailyChallengeUI() {
    if (!challengeProgressBar || !challengeProgressCount) return;
    
    const progress = gameState.dailyChallenge.progress;
    const target = gameState.dailyChallenge.target;
    const percentage = Math.min(100, (progress / target) * 100);
    
    challengeProgressBar.style.width = `${percentage}%`;
    challengeProgressCount.textContent = `${progress}/${target}`;
  }

  function updateTopicCards() {
    // Update progress for each topic and apply accessibility
    Object.keys(topicsConfig).forEach(topic => {
      const topicCard = document.querySelector(`.topic-card.${topic}`);
      if (!topicCard) return;
      
      const completedEl = document.getElementById(`${topic}-cards-completed`);
      const progressFillEl = document.querySelector(`.topic-card.${topic} .topic-progress-fill`);
      
      if (!gameState.topicProgress[topic]) {
        gameState.topicProgress[topic] = { 
          completed: 0, 
          percentage: 0,
          total: topicsConfig[topic].total
        };
      }
      
      const progress = gameState.topicProgress[topic];
      
      // Check if user has access to this topic
      const hasAccess = accessibleTopics[topic] !== undefined;
      
      // Show or hide the topic card based on access
      if (hasAccess) {
        topicCard.classList.remove('hidden');
        
        // Update progress display
        if (completedEl) {
          completedEl.textContent = progress.completed || 0;
        }
        
        if (progressFillEl) {
          progressFillEl.style.width = `${progress.percentage || 0}%`;
        }
      } else {
        // Hide topics the user doesn't have access to
        topicCard.classList.add('hidden');
      }
    });
  }

  async function populateLeaderboard() {
    if (!leaderboardTable) return;
    
    // Show loading state
    leaderboardTable.innerHTML = `
      <tr class="animate-pulse">
        <td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">
          Loading leaderboard data...
        </td>
      </tr>
    `;
    
    try {
      // Try to fetch from server if we're logged in
      if (currentUser && localStorage.getItem('authToken')) {
        const response = await fetch('/api/leaderboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          displayLeaderboardData(data);
          return;
        }
      }
      
      // Fallback to sample data if server fetch fails or user not logged in
      displaySampleLeaderboardData();
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      displaySampleLeaderboardData();
    }
  }

  function displayLeaderboardData(data) {
    if (!leaderboardTable) return;
    
    if (!data || !data.length) {
      leaderboardTable.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4 text-gray-500 dark:text-gray-400">
            No leaderboard data available
          </td>
        </tr>
      `;
      return;
    }
    
    leaderboardTable.innerHTML = '';
    
    // Display top entries
    data.slice(0, 5).forEach((entry, index) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-200 dark:border-gray-700';
      
      row.innerHTML = `
        <td class="px-2 py-3 font-medium">${index + 1}</td>
        <td class="px-2 py-3 flex items-center">
          <img src="avatars/${entry.avatar || 'default'}.png" alt="Avatar" class="w-6 h-6 rounded-full mr-2">
          <span>${entry.name}</span>
        </td>
        <td class="px-2 py-3">${entry.level}</td>
        <td class="px-2 py-3 font-medium">${entry.points.toLocaleString()}</td>
      `;
      
      leaderboardTable.appendChild(row);
    });
  }

  function displaySampleLeaderboardData() {
    // Use sample data for demonstration
    const sampleData = [
      { rank: 1, name: "PhysicsWiz", avatar: "default", level: 12, points: 8240 },
      { rank: 2, name: "QuantumQueen", avatar: "default", level: 10, points: 7115 },
      { rank: 3, name: "NewtonFan", avatar: "default", level: 9, points: 6430 },
      { rank: 4, name: "EinsteinFan", avatar: "default", level: 8, points: 5920 },
      { rank: 5, name: "PhysicsStudent", avatar: "default", level: 7, points: 4850 }
    ];
    
    displayLeaderboardData(sampleData);
  }

  function playSound(sound) {
    if (!gameState.settings.sound || !sounds[sound]) return;
    
    sounds[sound].currentTime = 0;
    sounds[sound].play().catch(err => {
      console.warn("Could not play sound:", err);
    });
  }

  function showNotification(message, type = 'default') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-16 right-4 z-40';
      document.body.appendChild(container);
    }
    
    // Create notification element
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

  // Expose functions that might be called from other scripts
  window.gameSystem = {
    loadGameState: loadGameState,
    saveGameState: saveGameState,
    updateTopicCards: updateTopicCards
  };

  // Initialize application
  init();
});