-- Add search frequency tracking to discovery_areas table
ALTER TABLE discovery_areas 
ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_background_discovery TIMESTAMP,
ADD COLUMN IF NOT EXISTS background_discovery_count INTEGER DEFAULT 0;

-- Create job history table for tracking background jobs
CREATE TABLE IF NOT EXISTS background_job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    job_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discovery_areas_search_count ON discovery_areas(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_areas_last_discovered ON discovery_areas(last_discovered);
CREATE INDEX IF NOT EXISTS idx_background_job_history_status ON background_job_history(status);
CREATE INDEX IF NOT EXISTS idx_background_job_history_job_type ON background_job_history(job_type);
CREATE INDEX IF NOT EXISTS idx_background_job_history_created_at ON background_job_history(created_at);

-- Update existing discovery_areas to set first_searched_at if null
UPDATE discovery_areas 
SET first_searched_at = last_discovered 
WHERE first_searched_at IS NULL;