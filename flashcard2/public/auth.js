document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginButton = document.getElementById('login-button');
  const loginError = document.getElementById('login-error');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const logoutButton = document.getElementById('logout-button');
  const userInfo = document.getElementById('user-info');
  const userNameDisplay = document.getElementById('user-name');
  
  // Check for existing session
  function init() {
    console.log("Initializing authentication system...");
    
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        loadUserProfile(user);
        hideLoginOverlay();
        console.log("User session restored from localStorage");
        
        // Validate token with server
        validateSession(token);
      } catch (error) {
        console.error("Error parsing saved user data:", error);
        showLoginOverlay();
      }
    } else {
      showLoginOverlay();
      console.log("No active session found");
    }
    
    setupEventListeners();
  }
  
  // Event Listeners
  function setupEventListeners() {
    if (loginButton) {
      loginButton.addEventListener('click', handleLogin);
    }
    
    if (loginForm) {
      loginForm.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          loginButton.click();
        }
      });
    }
    
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
  }
  
  // Login function
  async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
      showLoginError("Please enter both username and password");
      return;
    }
    
    try {
      // Show loading state
      loginButton.innerHTML = '<span class="loading-spinner"></span> Logging in...';
      loginButton.disabled = true;
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      // Store authentication token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      
      // Update UI
      loadUserProfile(data.user);
      hideLoginOverlay();
      
      // Clear form
      usernameInput.value = '';
      passwordInput.value = '';
      loginError.classList.add('hidden');
      
      // If window.gameSystem exists, tell it to refresh
      if (window.gameSystem && typeof window.gameSystem.loadGameState === 'function') {
        window.gameSystem.loadGameState();
      }
    } catch (error) {
      console.error("Login error:", error);
      showLoginError("Invalid username or password");
    } finally {
      // Reset button state
      loginButton.innerHTML = 'Log In';
      loginButton.disabled = false;
    }
  }
  
  function handleLogout() {
    // Save game state if needed
    if (window.gameSystem && typeof window.gameSystem.saveGameState === 'function') {
      window.gameSystem.saveGameState();
    }
    
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    
    showLoginOverlay();
    
    // Reload page to reset state
    window.location.reload();
  }
  
  // Validate token with server
  async function validateSession(token) {
    try {
      const response = await fetch('/api/validate-session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid session');
      }
    } catch (error) {
      console.error("Session validation error:", error);
      // Token is invalid, force logout
      handleLogout();
    }
  }
  
  // Load user profile into UI
  function loadUserProfile(user) {
    if (userInfo) {
      userInfo.classList.remove('hidden');
    }
    
    if (logoutButton) {
      logoutButton.classList.remove('hidden');
    }
    
    if (userNameDisplay) {
      userNameDisplay.textContent = user.name;
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
  
  // Initialize when DOM is loaded
  init();
});