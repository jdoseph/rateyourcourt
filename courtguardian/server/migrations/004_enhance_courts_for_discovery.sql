-- Migration to enhance courts table for Google Places API integration and validation

-- Add new columns for Google Places integration
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_total_ratings INTEGER,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
ADD COLUMN IF NOT EXISTS photos JSONB,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'needs_review', 'rejected')),
ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(50) DEFAULT 'manual' CHECK (discovery_source IN ('manual', 'google_places', 'user_submission')),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index on google_place_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_courts_google_place_id ON courts(google_place_id);
CREATE INDEX IF NOT EXISTS idx_courts_verification_status ON courts(verification_status);
CREATE INDEX IF NOT EXISTS idx_courts_location ON courts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_courts_sport_location ON courts(sport_type, latitude, longitude);

-- Create table for user court verifications
CREATE TABLE IF NOT EXISTS court_verifications (
    id SERIAL PRIMARY KEY,
    court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('correction', 'confirmation', 'addition')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for court verifications
CREATE INDEX IF NOT EXISTS idx_court_verifications_court_id ON court_verifications(court_id);
CREATE INDEX IF NOT EXISTS idx_court_verifications_status ON court_verifications(status);
CREATE INDEX IF NOT EXISTS idx_court_verifications_user_id ON court_verifications(user_id);

-- Create table for search areas to track discovery progress
CREATE TABLE IF NOT EXISTS discovery_areas (
    id SERIAL PRIMARY KEY,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 5000,
    sport_type VARCHAR(50) NOT NULL,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    courts_found INTEGER DEFAULT 0,
    search_status VARCHAR(50) DEFAULT 'completed' CHECK (search_status IN ('pending', 'in_progress', 'completed', 'failed')),
    UNIQUE(center_latitude, center_longitude, radius_meters, sport_type)
);

CREATE INDEX IF NOT EXISTS idx_discovery_areas_location ON discovery_areas(center_latitude, center_longitude);
CREATE INDEX IF NOT EXISTS idx_discovery_areas_sport ON discovery_areas(sport_type);

-- Update existing courts to have default values
UPDATE courts 
SET 
    verification_status = 'verified',
    discovery_source = 'manual',
    verification_count = 1,
    last_verified_at = CURRENT_TIMESTAMP,
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
WHERE verification_status IS NULL;