-- Add court photos table
CREATE TABLE IF NOT EXISTS court_photos (
    id SERIAL PRIMARY KEY,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    original_filename TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    upload_source VARCHAR(20) DEFAULT 'user_upload', -- 'user_upload', 'admin_upload', 'places_api'
    is_primary BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE, -- For moderation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_court_photos_court_id ON court_photos(court_id);
CREATE INDEX IF NOT EXISTS idx_court_photos_user_id ON court_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_court_photos_approved ON court_photos(is_approved);
CREATE INDEX IF NOT EXISTS idx_court_photos_primary ON court_photos(is_primary);

-- Add review photos table for photos in reviews
CREATE TABLE IF NOT EXISTS review_photos (
    id SERIAL PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    original_filename TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for review photos
CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_court_id ON review_photos(court_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_user_id ON review_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_approved ON review_photos(is_approved);

-- Add photo count column to courts table for performance
ALTER TABLE courts ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0;

-- Create trigger to update photo count
CREATE OR REPLACE FUNCTION update_court_photo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE courts SET photo_count = (
            SELECT COUNT(*) FROM court_photos 
            WHERE court_id = NEW.court_id AND is_approved = TRUE
        ) WHERE id = NEW.court_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courts SET photo_count = (
            SELECT COUNT(*) FROM court_photos 
            WHERE court_id = OLD.court_id AND is_approved = TRUE
        ) WHERE id = OLD.court_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE courts SET photo_count = (
            SELECT COUNT(*) FROM court_photos 
            WHERE court_id = NEW.court_id AND is_approved = TRUE
        ) WHERE id = NEW.court_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_court_photo_count ON court_photos;
CREATE TRIGGER trigger_update_court_photo_count
    AFTER INSERT OR UPDATE OR DELETE ON court_photos
    FOR EACH ROW EXECUTE FUNCTION update_court_photo_count();