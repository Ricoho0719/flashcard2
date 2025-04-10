// script.js
// Encapsulate functionality inside an IIFE for scope management.
(function () {
  "use strict";

  let currentUser = null;
  let studyTimer = null;
  let studySeconds = 0;
  let isTimerRunning = false;

  const loginOverlay = document.getElementById("login-overlay");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const userInfo = document.getElementById("user-info");
  const userInitial = document.getElementById("user-initial");
  const userNameDisplay = document.getElementById("user-name");
  const userStreak = document.getElementById("user-streak");
  const logoutButton = document.getElementById("logout-button");
  const timerButton = document.getElementById("timer-button");
  const timerDisplay = document.getElementById("timer-display");
  const progressCircle = document.getElementById("progress-circle");
  const goalProgress = document.getElementById("goal-progress");
  const goalText = document.getElementById("goal-text");
  const toggleThemeBtn = document.getElementById("toggle-theme");
  const toggleThemeLoginBtn = document.getElementById("toggle-theme-login");

  function init() {
    console.log("Initializing client-side application...");
    // Check if a user is already logged in (using token from localStorage)
    const token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("currentUser");
    if (token && savedUser) {
      currentUser = JSON.parse(savedUser);
      hideLoginOverlay();
      updateUserInterface();
      console.log("User session loaded from localStorage:", currentUser);
    }
    setupEventListeners();
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
      if (event.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    });
  }

  function setupEventListeners() {
    loginButton.addEventListener("click", handleLogin);
    usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") passwordInput.focus();
    });
    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });
    logoutButton.addEventListener("click", handleLogout);
    timerButton.addEventListener("click", toggleTimer);
    toggleThemeBtn.addEventListener("click", toggleTheme);
    toggleThemeLoginBtn.addEventListener("click", toggleTheme);

    document.querySelectorAll(".topic-button").forEach((button) => {
      button.addEventListener("click", () => {
        const topic = button.getAttribute("data-topic");
        console.log("Topic button clicked:", topic);
        trackTopicVisit(topic);
      });
    });
  }

  async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    console.log("Attempting login with username:", username);

    if (!username || !password) {
      console.error("Username or password field is empty.");
      showLoginError();
      return;
    }

    try {
      const apiUrl = "/api/login";// Adjust URL as needed.
      console.log("Sending login request to:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      console.log("Server response:", result);
      
      if (response.ok) {
        console.log("Login successful:", result.user);
        localStorage.setItem("authToken", result.token);
        currentUser = result.user;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        hideLoginOverlay();
        updateUserInterface();
        usernameInput.value = "";
        passwordInput.value = "";
        loginError.classList.add("hidden");
      } else {
        console.error("Login failed, server returned an error.");
        showLoginError();
      }
    } catch (error) {
      console.error("Error during login fetch:", error);
      showLoginError();
    }
  }

  function showLoginError() {
    loginError.classList.remove("hidden");
    passwordInput.value = "";
  }

  function hideLoginOverlay() {
    loginOverlay.classList.add("hidden");
  }

  function handleLogout() {
    if (isTimerRunning) stopTimer();
    currentUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    showLoginOverlay();
  }

  function updateUserInterface() {
    if (currentUser) {
      userInfo.classList.remove("hidden");
      logoutButton.classList.remove("hidden");
      userInitial.textContent = currentUser.name.charAt(0).toUpperCase();
      userNameDisplay.textContent = currentUser.name;
      userStreak.textContent = `${currentUser.streak || 0} day streak`;
      updateTopicProgress();
    } else {
      userInfo.classList.add("hidden");
      logoutButton.classList.add("hidden");
    }
  }

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
  }

  function trackTopicVisit(topic) {
    if (!currentUser) return;
    if (!currentUser.topicProgress) currentUser.topicProgress = {};
    const totalCardsElement = document.getElementById(`${topic}-total-cards`);
    if (!totalCardsElement) {
      console.error(`Element with ID "${topic}-total-cards" not found.`);
      return;
    }
    const totalCards = parseInt(totalCardsElement.textContent);
    const currentProgress = currentUser.topicProgress[topic] || 0;
    const newProgress = currentProgress < totalCards ? currentProgress + 1 : totalCards;
    console.log(`Updating progress for topic "${topic}": ${currentProgress} -> ${newProgress}`);
    currentUser.topicProgress[topic] = newProgress;
    updateStreak();
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateTopicProgress();
  }

  function updateTopicProgress() {
    if (!currentUser || !currentUser.topicProgress) return;
    Object.keys(currentUser.topicProgress).forEach((topic) => {
      const elem = document.getElementById(`${topic}-cards-completed`);
      if (elem) {
        elem.textContent = currentUser.topicProgress[topic];
      } else {
        console.warn(`Progress element for topic "${topic}" not found.`);
      }
    });
  }

  function updateStreak() {
    if (!currentUser) return;
    const today = new Date().toDateString();
    if (!currentUser.lastStudyDate || currentUser.lastStudyDate !== today) {
      currentUser.streak = (currentUser.streak || 0) + 1;
      currentUser.lastStudyDate = today;
      userStreak.textContent = `${currentUser.streak} day streak`;
      console.log("Updated study streak to:", currentUser.streak);
    }
  }

  function toggleTimer() {
    if (!currentUser) return;
    if (isTimerRunning) {
      stopTimer();
      timerButton.textContent = "Resume Studying";
      timerButton.classList.remove("bg-red-500", "hover:bg-red-600");
      timerButton.classList.add("bg-indigo-600", "hover:bg-indigo-700");
    } else {
      startTimer();
      timerButton.textContent = "Pause";
      timerButton.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
      timerButton.classList.add("bg-red-500", "hover:bg-red-600");
    }
  }

  function startTimer() {
    isTimerRunning = true;
    studyTimer = setInterval(() => {
      studySeconds++;
      updateTimerDisplay();
      if (studySeconds === 300) updateStreak();
    }, 1000);
    console.log("Study timer started.");
  }

  function stopTimer() {
    isTimerRunning = false;
    clearInterval(studyTimer);
    console.log("Study timer stopped at", studySeconds, "seconds.");
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(studySeconds / 60);
    const seconds = studySeconds % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const circumference = 188.5;
    const dailyGoal = 1200;
    const offset = circumference - (studySeconds / dailyGoal) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    const progPercent = Math.min(100, (studySeconds / dailyGoal) * 100);
    goalProgress.style.width = `${progPercent}%`;
    goalText.textContent = `${Math.floor(studySeconds / 60)}/20 min`;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
