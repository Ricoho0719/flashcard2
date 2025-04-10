document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');
  
    function showLoginOverlay() {
      if (loginOverlay) {
        loginOverlay.classList.remove('hidden');
      }
    }
    
    function hideLoginOverlay() {
      if (loginOverlay) {
        loginOverlay.classList.add('hidden');
      }
    }
  
    function login(username, password) {
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
        .then(res => {
          if (!res.ok) throw new Error('Invalid credentials');
          return res.json();
        })
        .then(data => {
          localStorage.setItem('authToken', data.token);
          if (userInfo) {
            userInfo.classList.remove('hidden');
            const userNameDisplay = document.getElementById('user-name');
            if (userNameDisplay) userNameDisplay.textContent = data.user.name;
          }
          if (logoutButton) logoutButton.classList.remove('hidden');
          loginError.classList.add('hidden');
          hideLoginOverlay();
        })
        .catch(err => {
          console.error(err);
          loginError.textContent = "Invalid username or password.";
          loginError.classList.remove('hidden');
        });
    }
  
    if (!localStorage.getItem('authToken')) {
      showLoginOverlay();
    } else {
      hideLoginOverlay();
      if (userInfo) userInfo.classList.remove('hidden');
      if (logoutButton) logoutButton.classList.remove('hidden');
    }
    
    if (loginButton) {
      loginButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        login(username, password);
      });
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
      logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        if (userInfo) userInfo.classList.add('hidden');
        logoutButton.classList.add('hidden');
        showLoginOverlay();
      });
    }
  });
  