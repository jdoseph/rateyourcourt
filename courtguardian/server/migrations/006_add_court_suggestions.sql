-- Migration: Add court suggestions table
-- This allows users to suggest new courts for admin review

-- Create court_suggestions table
CREATE TABLE IF NOT EXISTS court_suggestions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  sport_type VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  contact_info TEXT,
  suggested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add check constraint for status
ALTER TABLE court_suggestions 
ADD CONSTRAINT court_suggestions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add check constraint for sport type
ALTER TABLE court_suggestions 
ADD CONSTRAINT court_suggestions_sport_type_check 
CHECK (sport_type IN ('Tennis', 'Pickleball', 'Basketball', 'Volleyball', 'Badminton', 'Padel'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_court_suggestions_suggested_by ON court_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_court_suggestions_status ON court_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_court_suggestions_sport_type ON court_suggestions(sport_type);
CREATE INDEX IF NOT EXISTS idx_court_suggestions_created_at ON court_suggestions(created_at);

-- Add location index for spatial queries
CREATE INDEX IF NOT EXISTS idx_court_suggestions_location ON court_suggestions(latitude, longitude);

-- Add comments
COMMENT ON TABLE court_suggestions IS 'User-submitted court suggestions awaiting admin review';
COMMENT ON COLUMN court_suggestions.status IS 'Suggestion status: pending, approved, rejected';
COMMENT ON COLUMN court_suggestions.admin_notes IS 'Notes from admin during review process';