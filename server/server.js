"use strict";

// Load environment variables from a .env file in the server folder
require("dotenv").config();

const express = require("express");
const path = require("path"); // Helps build file paths reliably
const bcrypt = require("bcrypt"); // For hashing and comparing passwords
const { Pool } = require("pg");  // PostgreSQL connection pool

const app = express();
const port = process.env.PORT || 3000;

// ===============================
// CORS Middleware
// Set headers to allow cross-origin requests; adjust origin for production.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");  // Allow all domains (for now)
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("OPTIONS preflight request received, sending 200");
    return res.sendStatus(200);
  }
  
  next();
});

// Use Express built-in middleware to parse JSON bodies
app.use(express.json());

// ===============================
// Serve Static Files
// Your static files reside in ../public relative to the current directory (server folder)
app.use(express.static(path.join(__dirname, "../public")));

// ===============================
// Database Setup
// Create a PostgreSQL connection pool using the DATABASE_URL from the .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// ===============================
// /api/login Route
// Validates a login request by comparing the provided password with the hashed password in your PostgreSQL database.
app.post("/api/login", async (req, res) => {
  console.log("----- New Login Attempt -----");
  const { username, password } = req.body;
  console.log("Received login attempt for username:", username);

  if (!username || !password) {
    console.error("Missing username or password in request");
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    // Query the "public.users" table for a matching user
    const query = "SELECT id, name, username, password_hash, is_admin FROM public.users WHERE username = $1";
    const values = [username];
    const result = await pool.query(query, values);
    console.log("Query result rows:", result.rows);

    if (result.rows.length === 0) {
      console.error("User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    console.log("Comparing provided password with stored hash for user:", username);
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.error("Password mismatch for user:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Password verified for user:", username);
    // In production, replace the dummy token with a real secure token (for example, a JWT)
    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        isAdmin: user.is_admin
      },
      token: "dummy-token"
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Save Game State API
app.post("/api/save-game-state", async (req, res) => {
  console.log("----- Saving Game State -----");
  const { gameState } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("Missing authentication token");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (token !== "dummy-token") { // In a real app, verify the JWT
    console.error("Invalid token:", token);
    return res.status(401).json({ message: "Invalid token" });
  }
  
  try {
    // In a real app, you'd get the user ID from the JWT
    const userId = 1; // Default user ID for testing
    
    // Store the game state in the database
    // This is a placeholder - in a real app, you'd have a game_states table
    console.log(`Game state saved for user ${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving game state:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Leaderboard API
app.get("/api/leaderboard", async (req, res) => {
  console.log("----- Fetching Leaderboard -----");
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("Missing authentication token");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  if (token !== "dummy-token") { // In a real app, verify the JWT
    console.error("Invalid token:", token);
    return res.status(401).json({ message: "Invalid token" });
  }
  
  try {
    // This would normally come from the database
    // For demo purposes, we're returning sample data
    const leaderboardData = [
      { name: "PhysicsWiz", avatar: "default", level: 12, points: 8240 },
      { name: "QuantumQueen", avatar: "default", level: 10, points: 7115 },
      { name: "NewtonFan", avatar: "default", level: 9, points: 6430 },
      { name: "EinsteinFan", avatar: "default", level: 8, points: 5920 },
      { name: "PhysicsStudent", avatar: "default", level: 7, points: 4850 }
    ];
    
    res.json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Save a flashcard
app.post("/api/save-flashcard", async (req, res) => {
  console.log("----- New Save Flashcard Attempt -----");
  const { topic, cardIndex } = req.body;
  
  // Validate input
  if (topic === undefined || cardIndex === undefined) {
    console.error("Missing topic or cardIndex in request");
    return res.status(400).json({ message: "Missing topic or cardIndex" });
  }
  
  console.log(`Received save request for topic=${topic}, cardIndex=${cardIndex}`);
  
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("Missing authentication token");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // In a real app, verify the JWT token
  // For now, using a simple token validation (NOT FOR PRODUCTION)
  if (token !== "dummy-token") {
    console.error("Invalid token:", token);
    return res.status(401).json({ message: "Invalid token" });
  }
  
  try {
    // Get user ID from token
    // In a real app, you'd decode the JWT
    const userId = 1; // Default to user ID 1 for testing
    
    console.log(`Saving flashcard: Topic=${topic}, CardIndex=${cardIndex} for User=${userId}`);
    
    // Insert the saved flashcard
    const query = "INSERT INTO public.saved_flashcards (user_id, topic, card_index) VALUES ($1, $2, $3) ON CONFLICT (user_id, topic, card_index) DO NOTHING RETURNING id";
    const result = await pool.query(query, [userId, topic, cardIndex]);
    
    console.log("Save result:", result.rows);
    
    if (result.rows.length > 0) {
      res.json({ success: true, id: result.rows[0].id });
    } else {
      // Card was already saved
      // Get the ID of the existing saved card
      const existingQuery = "SELECT id FROM public.saved_flashcards WHERE user_id = $1 AND topic = $2 AND card_index = $3";
      const existingResult = await pool.query(existingQuery, [userId, topic, cardIndex]);
      
      if (existingResult.rows.length > 0) {
        res.json({ success: true, id: existingResult.rows[0].id });
      } else {
        console.error("Failed to save or find flashcard");
        res.status(500).json({ message: "Failed to save flashcard" });
      }
    }
  } catch (error) {
    console.error("Error saving flashcard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Get user's saved flashcards
app.get("/api/saved-flashcards", async (req, res) => {
  console.log("----- Fetching Saved Flashcards -----");
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("Missing authentication token");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // In a real app, verify the JWT token
  // For now, using a simple token validation (NOT FOR PRODUCTION)
  if (token !== "dummy-token") {
    console.error("Invalid token:", token);
    return res.status(401).json({ message: "Invalid token" });
  }
  
  try {
    // Get user ID from token
    // In a real app, you'd decode the JWT
    const userId = 1; // Default to user ID 1 for testing
    
    console.log(`Fetching saved flashcards for User=${userId}`);
    
    const query = "SELECT id, topic, card_index, saved_at, notes FROM public.saved_flashcards WHERE user_id = $1 ORDER BY saved_at DESC";
    const result = await pool.query(query, [userId]);
    
    console.log(`Found ${result.rows.length} saved flashcards`);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching saved flashcards:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ===============================
// Remove a saved flashcard
app.delete("/api/saved-flashcards/:id", async (req, res) => {
  console.log("----- Removing Saved Flashcard -----");
  const { id } = req.params;
  
  // Validate ID parameter
  if (!id) {
    console.error("Missing ID parameter");
    return res.status(400).json({ message: "Missing ID parameter" });
  }
  
  console.log(`Received delete request for savedFlashcard ID=${id}`);
  
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.error("Missing authentication token");
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // In a real app, verify the JWT token
  // For now, using a simple token validation
  if (token !== "dummy-token") {
    console.error("Invalid token:", token);
    return res.status(401).json({ message: "Invalid token" });
  }
  
  try {
    // Get user ID from token
    // In a real app, you'd decode the JWT
    const userId = 1; // Default to user ID 1 for testing
    
    console.log(`Removing saved flashcard ID=${id} for User=${userId}`);
    
    // First check if the record exists
    const checkQuery = "SELECT id FROM public.saved_flashcards WHERE id = $1 AND user_id = $2";
    const checkResult = await pool.query(checkQuery, [id, userId]);
    
    if (checkResult.rows.length === 0) {
      console.warn(`Saved flashcard with ID=${id} not found for user ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Saved flashcard not found" 
      });
    }
    
    // Proceed with deletion
    const deleteQuery = "DELETE FROM public.saved_flashcards WHERE id = $1 AND user_id = $2";
    const result = await pool.query(deleteQuery, [id, userId]);
    
    console.log(`Deleted ${result.rowCount} rows`);
    
    if (result.rowCount === 0) {
      console.error(`Delete operation affected 0 rows for ID=${id}, User=${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Failed to delete saved flashcard" 
      });
    }
    
    // Success response
    res.json({ 
      success: true,
      message: "Saved flashcard successfully deleted" 
    });
  } catch (error) {
    console.error("Error removing saved flashcard:", error);
    // Send more detailed error for debugging
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// ===============================
// Fallback Route (Optional)
// If no other route matches, return index.html. This is useful if you're using client-side routing.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ===============================
// Start the Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});