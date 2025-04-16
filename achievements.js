// achievements.js - Manages the achievement system and statistics display

document.addEventListener('DOMContentLoaded', () => {
  // List of all possible achievements
  const ACHIEVEMENTS = [
    {
      id: 'first_card',
      title: 'First Step',
      description: 'Review your first flashcard',
      points: 50,
      icon: 'school',
      condition: (state) => state.totalCardsCompleted >= 1
    },
    {
      id: 'fast_learner',
      title: 'Fast Learner',
      description: 'Review 10 cards in one day',
      points: 100,
      icon: 'speed',
      condition: (state) => state.stats.cardsToday >= 10
    },
    {
      id: 'topic_master',
      title: 'Topic Master',
      description: 'Complete an entire topic',
      points: 200,
      icon: 'workspace_premium',
      condition: (state) => Object.values(state.topicProgress || {}).some(
        topic => topic.completed === topic.total && topic.total > 0
      )
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Maintain a 7-day streak',
      points: 500,
      icon: 'calendar_month',
      condition: (state) => state.streak >= 7
    },
    {
      id: 'physics_enthusiast',
      title: 'Physics Enthusiast',
      description: 'Review at least one card for 30 consecutive days',
      points: 1000,
      icon: 'auto_awesome',
      condition: (state) => state.streak >= 30
    },
    {
      id: 'knowledge_explorer',
      title: 'Knowledge Explorer',
      description: 'Review cards from all available topics',
      points: 150,
      icon: 'travel_explore',
      condition: (state) => {
        const topics = ['mechanics', 'materials', 'electricity', 'waves', 'photon'];
        return topics.every(topic => 
          state.topicProgress && 
          state.topicProgress[topic] && 
          state.topicProgress[topic].completed > 0
        );
      }
    },
    {
      id: 'daily_devotion',
      title: 'Daily Devotion',
      description: 'Complete 5 daily challenges',
      points: 250,
      icon: 'assignment_turned_in',
      condition: (state) => state.stats.challengesCompleted >= 5
    },
    {
      id: 'review_master',
      title: 'Review Master',
      description: 'Review 100 cards in total',
      points: 300,
      icon: 'military_tech',
      condition: (state) => state.totalCardsCompleted >= 100
    },
    {
      id: 'quick_learner',
      title: 'Quick Learner',
      description: 'Review 20 cards in a single session',
      points: 200,
      icon: 'bolt',
      condition: (state) => state.stats.sessionCards >= 20
    },
    {
      id: 'milestone_master',
      title: 'Milestone Master',
      description: 'Reach 3 session milestones',
      points: 150,
      icon: 'flag',
      condition: (state) => state.stats.sessionMilestones && state.stats.sessionMilestones.length >= 3
    },
    {
      id: 'dedicated_student',
      title: 'Dedicated Student',
      description: 'Reach level 5',
      points: 250,
      icon: 'psychology',
      condition: (state) => state.level >= 5
    },
    {
      id: 'physics_scholar',
      title: 'Physics Scholar',
      description: 'Reach level 10',
      points: 500,
      icon: 'school',
      condition: (state) => state.level >= 10
    }
  ];

  // Rank definitions based on level
  const RANKS = [
    { minLevel: 1, maxLevel: 5, title: 'Novice', icon: 'emoji_events' },
    { minLevel: 6, maxLevel: 10, title: 'Apprentice', icon: 'psychology' },
    { minLevel: 11, maxLevel: 15, title: 'Scholar', icon: 'school' },
    { minLevel: 16, maxLevel: 20, title: 'Master', icon: 'workspace_premium' },
    { minLevel: 21, maxLevel: 25, title: 'Expert', icon: 'stars' },
    { minLevel: 26, maxLevel: 30, title: 'Genius', icon: 'auto_awesome' },
    { minLevel: 31, maxLevel: Infinity, title: 'Physics Legend', icon: 'rocket_launch' }
  ];

  // DOM references
  const achievementsModal = document.getElementById('achievements-modal');
  const achievementsList = document.getElementById('achievements-list');
  const closeAchievementsBtn = document.getElementById('close-achievements-btn');
  const closeAchievementsX = document.getElementById('close-achievements');
  const showAchievementsBtn = document.getElementById('show-achievements');
  const statsModal = document.getElementById('stats-modal');
  const showStatsBtn = document.getElementById('show-stats');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const closeStatsX = document.getElementById('close-stats');
  const statsList = document.getElementById('stats-list');
  const rankDisplay = document.getElementById('rank-display');
  const rankIcon = document.getElementById('rank-icon');

  // Initialize 
  function init() {
    setupEventListeners();
    updateRankDisplay();
  }

  function setupEventListeners() {
    // Show/hide achievements modal
    if (showAchievementsBtn) {
      showAchievementsBtn.addEventListener('click', () => {
        displayAchievements();
        achievementsModal.classList.remove('hidden');
      });
    }

    // Close achievements modal
    if (closeAchievementsBtn) {
      closeAchievementsBtn.addEventListener('click', () => {
        achievementsModal.classList.add('hidden');
      });
    }

    if (closeAchievementsX) {
      closeAchievementsX.addEventListener('click', () => {
        achievementsModal.classList.add('hidden');
      });
    }

    // Show/hide stats modal
    if (showStatsBtn) {
      showStatsBtn.addEventListener('click', () => {
        displayStats();
        statsModal.classList.remove('hidden');
      });
    }

    // Close stats modal
    if (closeStatsBtn) {
      closeStatsBtn.addEventListener('click', () => {
        statsModal.classList.add('hidden');
      });
    }

    if (closeStatsX) {
      closeStatsX.addEventListener('click', () => {
        statsModal.classList.add('hidden');
      });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === achievementsModal) {
        achievementsModal.classList.add('hidden');
      }
      if (e.target === statsModal) {
        statsModal.classList.add('hidden');
      }
    });

    // Listen for key presses
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        achievementsModal.classList.add('hidden');
        statsModal.classList.add('hidden');
      }
    });
  }

  // Display achievements in modal
  function displayAchievements() {
    if (!achievementsList) return;

    // Get current game state
    const gameState = getGameState();
    const earnedAchievements = gameState.achievements || {};

    // Clear previous content
    achievementsList.innerHTML = '';

    // Populate achievements
    ACHIEVEMENTS.forEach(achievement => {
      const isEarned = earnedAchievements[achievement.id];
      
      const achievementElement = document.createElement('div');
      achievementElement.className = `achievement-card ${isEarned ? 'earned' : 'locked'}`;
      
      achievementElement.innerHTML = `
        <div class="achievement-icon">
          <span class="material-icons text-white">${achievement.icon}</span>
        </div>
        <div class="flex-grow">
          <h3 class="font-bold text-white">${achievement.title}</h3>
          <p class="text-gray-300 text-sm">${achievement.description}</p>
          <div class="mt-1 text-yellow-300 text-sm font-semibold">+${achievement.points} points</div>
        </div>
        <div class="ml-2 flex-shrink-0">
          ${isEarned ? 
            '<span class="material-icons text-green-400">check_circle</span>' : 
            '<span class="material-icons text-gray-500">lock</span>'}
        </div>
      `;
      
      achievementsList.appendChild(achievementElement);
    });
  }

  // Display statistics in modal
  function displayStats() {
    if (!statsList) return;

    // Get current game state
    const gameState = getGameState();
    
    // Calculate statistics
    const totalCards = gameState.totalCardsCompleted || 0;
    const cardsToday = gameState.stats?.cardsToday || 0;
    const challengesCompleted = gameState.stats?.challengesCompleted || 0;
    const currentStreak = gameState.streak || 0;
    
    // Calculate topic completion percentages
    const topicProgress = gameState.topicProgress || {};
    const topicStats = Object.entries(topicProgress).map(([topic, progress]) => {
      const name = topic.charAt(0).toUpperCase() + topic.slice(1);
      const percentage = progress.percentage || 0;
      const completed = progress.completed || 0;
      const total = progress.total || 0;
      
      return { name, percentage, completed, total };
    });

    // Clear previous content
    statsList.innerHTML = '';

    // Add general statistics
    const generalStats = document.createElement('div');
    generalStats.className = "mb-6";
    generalStats.innerHTML = `
      <h3 class="text-lg font-bold text-white mb-3">General Statistics</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-indigo-900/50 rounded-lg p-3 flex items-center">
          <div class="bg-indigo-600 p-2 rounded-full mr-3">
            <span class="material-icons text-white">school</span>
          </div>
          <div>
            <div class="text-gray-300 text-xs">Total Cards Completed</div>
            <div class="text-white font-bold text-lg">${totalCards}</div>
          </div>
        </div>
        <div class="bg-indigo-900/50 rounded-lg p-3 flex items-center">
          <div class="bg-green-600 p-2 rounded-full mr-3">
            <span class="material-icons text-white">today</span>
          </div>
          <div>
            <div class="text-gray-300 text-xs">Cards Today</div>
            <div class="text-white font-bold text-lg">${cardsToday}</div>
          </div>
        </div>
        <div class="bg-indigo-900/50 rounded-lg p-3 flex items-center">
          <div class="bg-yellow-600 p-2 rounded-full mr-3">
            <span class="material-icons text-white">assignment_turned_in</span>
          </div>
          <div>
            <div class="text-gray-300 text-xs">Challenges Completed</div>
            <div class="text-white font-bold text-lg">${challengesCompleted}</div>
          </div>
        </div>
        <div class="bg-indigo-900/50 rounded-lg p-3 flex items-center">
          <div class="bg-red-600 p-2 rounded-full mr-3">
            <span class="material-icons text-white">local_fire_department</span>
          </div>
          <div>
            <div class="text-gray-300 text-xs">Current Streak</div>
            <div class="text-white font-bold text-lg">${currentStreak} days</div>
          </div>
        </div>
      </div>
    `;
    statsList.appendChild(generalStats);

    // Add topic progress
    const topicStatsEl = document.createElement('div');
    topicStatsEl.className = "mb-6";
    topicStatsEl.innerHTML = `
      <h3 class="text-lg font-bold text-white mb-3">Topic Progress</h3>
      <div class="space-y-3">
        ${topicStats.map(topic => `
          <div>
            <div class="flex justify-between mb-1">
              <div class="text-gray-300">${topic.name}</div>
              <div class="text-white font-medium">${topic.completed}/${topic.total}</div>
            </div>
            <div class="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style="width: ${topic.percentage}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    statsList.appendChild(topicStatsEl);

    // Add rank information
    const currentRank = getRank(gameState.level || 1);
    const nextRank = getNextRank(gameState.level || 1);
    
    const rankInfo = document.createElement('div');
    rankInfo.className = "mb-6";
    rankInfo.innerHTML = `
      <h3 class="text-lg font-bold text-white mb-3">Current Rank</h3>
      <div class="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4 flex items-center">
        <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 rounded-full mr-4">
          <span class="material-icons text-white text-2xl">${currentRank.icon}</span>
        </div>
        <div class="flex-grow">
          <div class="text-white font-bold text-xl">${currentRank.title}</div>
          <div class="text-gray-300 text-sm">Level ${gameState.level || 1}</div>
          ${nextRank ? `
            <div class="text-gray-300 text-xs mt-1">
              Next rank at Level ${nextRank.minLevel}: <span class="text-yellow-300 font-medium">${nextRank.title}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    statsList.appendChild(rankInfo);

    // Add recent achievements
    const earnedAchievements = Object.entries(gameState.achievements || {})
      .map(([id, data]) => {
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (!achievement) return null;
        
        return {
          ...achievement,
          earnedAt: data.earnedAt
        };
      })
      .filter(a => a) // Remove null entries
      .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt)) // Sort by date
      .slice(0, 3); // Take latest 3
    
    if (earnedAchievements.length > 0) {
      const recentAchievements = document.createElement('div');
      recentAchievements.innerHTML = `
        <h3 class="text-lg font-bold text-white mb-3">Recent Achievements</h3>
        <div class="space-y-2">
          ${earnedAchievements.map(achievement => `
            <div class="bg-indigo-900/30 rounded-lg p-3 flex items-center">
              <div class="bg-indigo-600 p-2 rounded-full mr-3 flex-shrink-0">
                <span class="material-icons text-white">${achievement.icon}</span>
              </div>
              <div class="flex-grow">
                <div class="text-white font-bold">${achievement.title}</div>
                <div class="text-gray-300 text-xs">${achievement.description}</div>
              </div>
              <div class="text-yellow-300 font-bold">+${achievement.points}</div>
            </div>
          `).join('')}
        </div>
      `;
      statsList.appendChild(recentAchievements);
    }
  }

  // Get the current rank based on level
  function getRank(level) {
    for (const rank of RANKS) {
      if (level >= rank.minLevel && level <= rank.maxLevel) {
        return rank;
      }
    }
    return RANKS[0]; // Default to first rank if no match
  }

  // Get the next rank
  function getNextRank(level) {
    const currentRankIndex = RANKS.findIndex(rank => 
      level >= rank.minLevel && level <= rank.maxLevel
    );
    
    if (currentRankIndex >= 0 && currentRankIndex < RANKS.length - 1) {
      return RANKS[currentRankIndex + 1];
    }
    
    return null; // No next rank
  }

  // Update rank display in the main UI
  function updateRankDisplay() {
    const gameState = getGameState();
    const level = gameState.level || 1;
    const rank = getRank(level);
    
    if (rankDisplay && rankIcon) {
      rankDisplay.textContent = rank.title;
      rankIcon.textContent = rank.icon;
    }
  }

  // Helper function to get the current game state from localStorage
  function getGameState() {
    try {
      return JSON.parse(localStorage.getItem('gameState') || '{}');
    } catch (e) {
      console.error('Error parsing game state:', e);
      return {};
    }
  }

  // Check for achievements that should be unlocked but aren't
  function checkMissingAchievements() {
    const gameState = getGameState();
    const earnedAchievements = gameState.achievements || {};
    
    let newAchievementsUnlocked = false;
    
    // Check each achievement
    ACHIEVEMENTS.forEach(achievement => {
      // Skip if already achieved
      if (earnedAchievements[achievement.id]) {
        return;
      }
      
      // Check if condition is met
      if (achievement.condition(gameState)) {
        // Award the achievement
        if (!gameState.achievements) {
          gameState.achievements = {};
        }
        
        gameState.achievements[achievement.id] = {
          earnedAt: new Date().toISOString(),
          displayed: false
        };
        
        console.log(`Achievement unlocked: ${achievement.title}`);
        newAchievementsUnlocked = true;
      }
    });
    
    if (newAchievementsUnlocked) {
      // Save updated state
      localStorage.setItem('gameState', JSON.stringify(gameState));
      
      // Update rank display
      updateRankDisplay();
    }
  }

  // Initialize the module
  init();
  
  // Check for missing achievements
  setTimeout(() => {
    checkMissingAchievements();
  }, 1000);

  // Expose public methods
  window.achievementSystem = {
    displayAchievements,
    displayStats,
    updateRankDisplay,
    checkMissingAchievements
  };
});