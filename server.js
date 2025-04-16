"use strict";

// Load environment variables from a .env file in the server folder
require("dotenv").config();

const express = require("express");
const path = require("path"); // Helps build file paths reliably
const bcrypt = require("bcrypt"); // For hashing and comparing passwords
const { Pool } = require("pg");  // PostgreSQL connection pool
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
// Authentication middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token validation error:", error.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// ===============================
// Login endpoint
// Update your login endpoint to include subject data
app.post("/api/login", async (req, res) => {
  console.log("----- New Login Attempt -----");
  const { username, password } = req.body;
  console.log("Received login attempt for username:", username);

  if (!username || !password) {
    console.error("Missing username or password in request");
    return res.status(400).json({ message: "Missing username or password" });
  }

  try {
    // Query to get user information
    const userQuery = "SELECT id, name, username, password_hash, is_admin FROM public.users WHERE username = $1";
    const userResult = await pool.query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      console.error("User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    console.log("Found user:", user.username);
    
    // Compare passwords
    const match = await bcrypt.compare(password, user.password_hash);
    console.log("Password match result:", match);
    
    if (!match) {
      console.error("Password mismatch for user:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Login successful for user:", username);
    
    // Fetch user subjects with IDs
    const subjectQuery = `
      SELECT s.id, s.code, s.name 
      FROM public.subjects s
      JOIN public.user_subjects us ON s.id = us.subject_id
      WHERE us.user_id = $1
    `;
    
    const subjectResult = await pool.query(subjectQuery, [user.id]);
    console.log(`Found ${subjectResult.rows.length} subjects for user ${user.id}`);
    
    // Create a map of subject data including IDs and names
    const subjectData = subjectResult.rows.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name
    }));
    
    // Also create a simple array of subject names for backward compatibility
    const subjectNames = subjectData.map(subject => subject.name);
    
    console.log("User subject data:", subjectData);
    
    // If no subjects found and user is admin, give access to all subjects
    if (subjectData.length === 0 && user.is_admin) {
      console.log("No subjects found for admin, granting all subjects");
      const allSubjectsQuery = "SELECT id, code, name FROM public.subjects";
      const allSubjectsResult = await pool.query(allSubjectsQuery);
      
      allSubjectsResult.rows.forEach(subject => {
        subjectData.push({
          id: subject.id,
          code: subject.code,
          name: subject.name
        });
        subjectNames.push(subject.name);
      });
    }
    
    // If still no subjects (non-admin user with no subjects), add a default
    if (subjectData.length === 0) {
      console.log("No subjects found for user, adding default subject");
      // Default to AS Physics (subject_id = 1)
      subjectData.push({
        id: 1,
        code: 1,
        name: "AS Physics"
      });
      subjectNames.push("AS Physics");
    }
    
    // Include subject IDs in the token
    const token = jwt.sign({ 
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin || false,
      subjectIds: subjectData.map(s => s.id) // Add this line back to include subject IDs
    }, JWT_SECRET, { 
      expiresIn: '7d' 
    });
    
    console.log(`Generated JWT token for user ${user.id}`);
    
    // Return user data with the JWT token and subject information
    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        isAdmin: user.is_admin || false,
        subjects: subjectNames,
        subjectData: subjectData // Include full subject data including IDs
      },
      token: token
    });
  } catch (error) {
    console.error("Error during login:", error);
    
    // Provide more detailed error logging
    if (error.code) {
      console.error("Database error code:", error.code);
    }
    if (error.detail) {
      console.error("Error detail:", error.detail);
    }
    
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
});

// Add this endpoint to retrieve saved flashcards
app.get("/api/saved-flashcards", authenticate, async (req, res) => {
  console.log("----- Fetching Saved Flashcards -----");
  const userId = req.user.userId;
  
  try {
    // Query to get all saved flashcards for this user
    const query = `
      SELECT sf.id, sf.topic, sf.card_index, sf.saved_at, sf.notes
      FROM public.saved_flashcards sf
      WHERE sf.user_id = $1
      ORDER BY sf.saved_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    console.log(`Found ${result.rows.length} saved flashcards for user ${userId}`);
    
    // Return the results
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching saved flashcards:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Add this new endpoint to fetch flashcards by subject
app.get("/api/flashcards/:subjectId", authenticate, async (req, res) => {
  const { subjectId } = req.params;
  const userId = req.user.userId;
  const userSubjectIds = req.user.subjectIds || [];
  
  console.log(`Fetching flashcards for subject ${subjectId} for user ${userId}`);
  
  // Check if user has access to this subject
  if (!userSubjectIds.includes(parseInt(subjectId)) && !req.user.isAdmin) {
    console.error(`User ${userId} does not have access to subject ${subjectId}`);
    return res.status(403).json({ message: "Access denied to this subject" });
  }
  
  try {
    // Query to get flashcard topics for this subject
    const topicsQuery = `
      SELECT DISTINCT topic 
      FROM public.flashcards 
      WHERE subject_id = $1
      ORDER BY topic
    `;
    
    const topicsResult = await pool.query(topicsQuery, [subjectId]);
    
    if (topicsResult.rows.length === 0) {
      // If no specific topics found, return default topics for AS Physics
      if (parseInt(subjectId) === 1) {
        console.log("No specific topics found, returning default AS Physics topics");
        return res.json({
          subjectId: 1,
          topics: ['mechanics', 'materials', 'electricity', 'waves', 'photon']
        });
      } else {
        return res.json({ subjectId: parseInt(subjectId), topics: [] });
      }
    }
    
    // Extract topics from result
    const topics = topicsResult.rows.map(row => row.topic);
    console.log(`Found ${topics.length} topics for subject ${subjectId}`);
    
    res.json({
      subjectId: parseInt(subjectId),
      topics: topics
    });
  } catch (error) {
    console.error(`Error fetching flashcards for subject ${subjectId}:`, error);
    res.status(500).json({ message: "Error fetching flashcard topics" });
  }
});

// Add this endpoint to fetch flashcards by topic
app.get("/api/flashcards/:subjectId/:topic", authenticate, async (req, res) => {
  const { subjectId, topic } = req.params;
  const userId = req.user.userId;
  const userSubjectIds = req.user.subjectIds || [];
  
  console.log(`Fetching flashcards for subject ${subjectId}, topic ${topic}`);
  
  // Check if user has access to this subject
  if (!userSubjectIds.includes(parseInt(subjectId)) && !req.user.isAdmin) {
    console.error(`User ${userId} does not have access to subject ${subjectId}`);
    return res.status(403).json({ message: "Access denied to this subject" });
  }
  
  try {
    // For AS Physics hardcoded topics, handle specially
    if (parseInt(subjectId) === 1 && 
        ['mechanics', 'materials', 'electricity', 'waves', 'photon'].includes(topic)) {
      
      // For these topics, we'll handle the special case of the JSON files
      console.log(`Handling special case for AS Physics topic ${topic}`);
      
      // We'll fetch from the database if the table has entries for this topic
      const countQuery = `
        SELECT COUNT(*) 
        FROM public.flashcards 
        WHERE subject_id = 1 AND topic = $1
      `;
      
      const countResult = await pool.query(countQuery, [topic]);
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        // Fetch from database
        const cardsQuery = `
          SELECT * 
          FROM public.flashcards 
          WHERE subject_id = 1 AND topic = $1
          ORDER BY card_index
        `;
        
        const cardsResult = await pool.query(cardsQuery, [topic]);
        
        // Format the response like the JSON files
        const flashcards = cardsResult.rows.map(card => ({
          question: card.question_path || `./${topic}/${card.card_index * 2 - 1}.jpg`,
          answer: card.answer_path || `./${topic}/${card.card_index * 2}.jpg`
        }));
        
        return res.json({ flashcards });
      } else {
        // Return information that client should use the JSON file
        return res.json({ 
          useJsonFile: true,
          file: `/${topic}.json` 
        });
      }
    }
    
    // For other subjects/topics, just query from the database
    const cardsQuery = `
      SELECT * 
      FROM public.flashcards 
      WHERE subject_id = $1 AND topic = $2
      ORDER BY card_index
    `;
    
    const cardsResult = await pool.query(cardsQuery, [subjectId, topic]);
    
    if (cardsResult.rows.length === 0) {
      return res.status(404).json({ message: "No flashcards found for this topic" });
    }
    
    const flashcards = cardsResult.rows.map(card => ({
      id: card.id,
      question: card.question_path || card.question_text,
      answer: card.answer_path || card.answer_text,
      cardIndex: card.card_index
    }));
    
    res.json({ flashcards });
  } catch (error) {
    console.error(`Error fetching flashcards for topic ${topic}:`, error);
    res.status(500).json({ message: "Error fetching flashcards" });
  }
});

// ===============================
// Session validation endpoint
app.get("/api/validate-session", authenticate, (req, res) => {
  console.log("----- Validating Session -----");
  // If we got here, the token is valid (authenticated middleware passed)
  res.json({ 
    valid: true, 
    user: {
      userId: req.user.userId,
      username: req.user.username,
      isAdmin: req.user.isAdmin
    }
  });
});

// ===============================
// Save Game State API
app.post("/api/save-game-state", authenticate, async (req, res) => {
  console.log("----- Saving Game State -----");
  const { gameState } = req.body;
  const userId = req.user.userId;
  
  try {
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
app.get("/api/leaderboard", authenticate, async (req, res) => {
  console.log("----- Fetching Leaderboard -----");
  
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
// Save flashcard endpoint
app.post("/api/save-flashcard", authenticate, async (req, res) => {
  console.log("----- New Save Flashcard Attempt -----");
  const { topic, cardIndex } = req.body;
  const userId = req.user.userId;
  
  // Validate input
  if (topic === undefined || cardIndex === undefined) {
    console.error("Missing topic or cardIndex in request");
    return res.status(400).json({ message: "Missing topic or cardIndex" });
  }
  
  console.log(`Received save request for topic=${topic}, cardIndex=${cardIndex}`);
  
  try {
    // Now insert the saved flashcard with the user ID from the token
    const insertQuery = `
      INSERT INTO public.saved_flashcards (user_id, topic, card_index) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (user_id, topic, card_index) DO NOTHING 
      RETURNING id
    `;
    
    const result = await pool.query(insertQuery, [userId, topic, cardIndex]);
    console.log("Insert result:", result.rows);
    
    if (result.rows.length > 0) {
      res.json({ success: true, id: result.rows[0].id });
    } else {
      // Card might already be saved - get the existing ID
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
    
    // Provide useful error information
    let errorMessage = "Internal server error";
    if (error.code === '23503') {
      errorMessage = "Foreign key constraint violation - valid user ID required";
    } else if (error.code === '23505') {
      errorMessage = "This flashcard is already saved";
    }
    
    res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      code: error.code || 'unknown'
    });
  }
});

// ===============================
// Remove a saved flashcard
app.delete("/api/saved-flashcards/:id", authenticate, async (req, res) => {
  console.log("----- Removing Saved Flashcard -----");
  const { id } = req.params;
  const userId = req.user.userId;
  
  // Validate ID parameter
  if (!id) {
    console.error("Missing ID parameter");
    return res.status(400).json({ message: "Missing ID parameter" });
  }
  
  console.log(`Received delete request for savedFlashcard ID=${id}`);
  
  try {
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