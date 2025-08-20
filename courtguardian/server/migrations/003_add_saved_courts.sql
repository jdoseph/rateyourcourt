-- Create saved_courts table to track which courts users have saved
CREATE TABLE saved_courts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, court_id)
);

-- Add index for better performance when querying by user
CREATE INDEX idx_saved_courts_user_id ON saved_courts(user_id);
CREATE INDEX idx_saved_courts_court_id ON saved_courts(court_id);