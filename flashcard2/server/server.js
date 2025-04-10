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
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
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
// Fallback Route (Optional)
// If no other route matches, return index.html. This is useful if you’re using client-side routing.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ===============================
// Start the Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
