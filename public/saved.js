// Add these endpoints to your server.js file after your existing login endpoint

// Create the database table for saved flashcards
// Run this SQL in your database first:
/*
CREATE TABLE public.saved_flashcards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    topic VARCHAR(50) NOT NULL,
    card_index INTEGER NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, topic, card_index)
);
*/

// Save a flashcard
app.post("/api/save-flashcard", async (req, res) => {
    console.log("----- New Save Flashcard Attempt -----");
    const { topic, cardIndex } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      console.error("Missing authentication token");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // In a real app, verify the JWT token
    // For now, using a simple token validation (NOT FOR PRODUCTION)
    // Assume token is "dummy-token" for now
    if (token !== "dummy-token") {
      console.error("Invalid token:", token);
      return res.status(401).json({ message: "Invalid token" });
    }
    
    try {
      // Get user ID from token
      // In a real app, you'd decode the JWT
      // For now, extract from request or session
      const userId = req.body.userId || 1; // Default to user ID 1 for testing
      
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
  
  // Remove a saved flashcard
  app.delete("/api/saved-flashcards/:id", async (req, res) => {
    console.log("----- Removing Saved Flashcard -----");
    const { id } = req.params;
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
      
      const query = "DELETE FROM public.saved_flashcards WHERE id = $1 AND user_id = $2";
      const result = await pool.query(query, [id, userId]);
      
      console.log(`Deleted ${result.rowCount} rows`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved flashcard:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });