// script.js - Main application functionality for the topic selection page
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

  // Topic configuration
  const topicsConfig = {
    mechanics: { name: "Mechanics", total: 51 },
    materials: { name: "Materials", total: 74 },
    electricity: { name: "Electricity", total: 35 },
    waves: { name: "Waves", total: 31 },
    photon: { name: "Photon", total: 36 }
  };

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
      loadGameState();
      updateUserInterface();
      console.log("User session loaded from localStorage");
    } else {
      showLoginOverlay();
    }
    
    setupEventListeners();
    setupTopicCards();
    checkDailyChallenge();
    populateLeaderboard();
    
    // Apply theme preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add("dark");
    }
  }

  function setupEventListeners() {
    // Login form events
    if (loginButton) {
      loginButton.addEventListener("click", handleLogin);
    }
    
    // Enter key on login form
    if (loginOverlay) {
      loginOverlay.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          loginButton.click();
        }
      });
    }
    
    // Auth-related events
    if (logoutButton) {
      logoutButton.addEventListener("click", handleLogout);
    }
    
    // Theme toggle event
    if (toggleThemeBtn) {
      toggleThemeBtn.addEventListener("click", toggleTheme);
    }
    
    // Refresh leaderboard
    if (refreshLeaderboardBtn) {
      refreshLeaderboardBtn.addEventListener("click", () => {
        populateLeaderboard();
        playSound('click');
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
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      try {
        gameState = JSON.parse(savedState);
        
        // Ensure all topics are present
        Object.keys(topicsConfig).forEach(topic => {
          if (!gameState.topicProgress[topic]) {
            gameState.topicProgress[topic] = { 
              completed: 0, 
              percentage: 0,
              total: topicsConfig[topic].total
            };
          }
        });
        
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

  function setupTopicCards() {
    // Set total cards count for each topic
    Object.keys(topicsConfig).forEach(topic => {
      const totalCardsEl = document.getElementById(`${topic}-total-cards`);
      if (totalCardsEl) {
        totalCardsEl.textContent = topicsConfig[topic].total;
      }
    });
  }

  function updateTopicCards() {
    // Update progress for each topic
    Object.keys(topicsConfig).forEach(topic => {
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
      
      if (completedEl) {
        completedEl.textContent = progress.completed || 0;
      }
      
      if (progressFillEl) {
        progressFillEl.style.width = `${progress.percentage || 0}%`;
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

  // Initialize application
  init();
});