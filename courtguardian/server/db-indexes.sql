-- Database indexes to improve courts query performance
-- Run these on your production database to speed up the courts endpoint

-- Index for sport_type filtering (used in WHERE clause)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_sport_type 
ON courts (sport_type);

-- Index for name sorting (used in ORDER BY clause)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_name 
ON courts (name);

-- Composite index for court_id on reviews table (used in JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_court_id 
ON reviews (court_id);

-- Index for verification status filtering (used in search endpoint)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_verification_status 
ON courts (verification_status);

-- Composite index for geographic searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_lat_lng 
ON courts (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for created_at column (for time-based queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_created_at 
ON courts (created_at);