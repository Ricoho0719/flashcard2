document.addEventListener('DOMContentLoaded', async () => {
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

  // Initialize the authentication system
  async function init() {
    console.log("Initializing authentication system...");
    
    // Attempt to load stored session
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        loadUserProfile(user);
        hideLoginOverlay();
        console.log("User session restored from localStorage");
        
        // Validate the token with the server
        await validateSession(token);
      } catch (error) {
        console.error("Error parsing saved user data or validating session:", error);
        clearSessionData();
        showLoginOverlay();
      }
    } else {
      console.log("No active session found");
      showLoginOverlay();
    }
    
    setupEventListeners();
  }
  
  // Set up event listeners for login, logout, and form submission
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
  
  // Handle the login process by communicating with the server
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
      
      console.log("Attempting login for:", username);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Login failed:", data);
        throw new Error(data.message || 'Login failed');
      }
      
      console.log("Login successful:", data.user.username);
      
      // Store authentication token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      
      if (data.user.subjectData && data.user.subjectData.length > 0) {
        localStorage.setItem('userSubjects', JSON.stringify(data.user.subjectData));
      }
      
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
      showLoginError(error.message || "Invalid username or password");
    } finally {
      // Reset button state
      loginButton.innerHTML = 'Log In';
      loginButton.disabled = false;
    }
  }
  
  // Handle logout: clear session data, show login overlay, and reload the page
  function handleLogout() {
    if (window.gameSystem && typeof window.gameSystem.saveGameState === 'function') {
      window.gameSystem.saveGameState();
    }
    
    clearSessionData();
    showLoginOverlay();
    window.location.reload();
  }
  
  // Clear session-related localStorage data
  function clearSessionData() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
  }
  
  // Validate the session token by calling the server endpoint
  async function validateSession(token) {
    try {
      const response = await fetch('/api/validate-session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Session invalid');
      }
      
      const result = await response.json();
      if (!result.valid) {
        throw new Error('Session marked invalid by server');
      }
      console.log("Session validated successfully.");
    } catch (error) {
      console.error("Session validation error:", error);
      // If validation fails, clear the session and force a logout
      clearSessionData();
      showLoginOverlay();
    }
  }
  
  // Load user profile information into the UI, including avatar using avatarSystem if available
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
    
    // Use the avatar system if available
    if (window.avatarSystem && userInfo) {
      let avatarContainer = userInfo.querySelector('.avatar-container');
      if (!avatarContainer) {
        avatarContainer = document.createElement('div');
        avatarContainer.className = 'avatar-container mr-2';
        userInfo.prepend(avatarContainer);
      }
      
      // Construct the avatar URL; fallback to 'default' if user.avatar is not set
      const avatarSrc = `avatars/${user.avatar || 'default'}.png`;
      window.avatarSystem.createAvatar(avatarContainer, user.name, avatarSrc, 'sm');
    }
  }
  
  // Functions to show or hide the login overlay
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

  // Display login error messages
  function showLoginError(message) {
    if (loginError) {
      loginError.textContent = message;
      loginError.classList.remove("hidden");
    }
  }
  
  // Start the authentication process
  await init();
});
