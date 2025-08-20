# Rate Your Court - Production Deployment Guide

## 🚀 Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a strong database password
3. Wait for the project to be created (2-3 minutes)

### 2. Set Up Database Schema
1. Go to the SQL Editor in your Supabase dashboard
2. Run the following SQL to create the database schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avatar_colors JSON DEFAULT '{"start": "#3498db", "end": "#2c3e50"}',
  notification_settings JSONB,
  privacy_settings JSONB,
  role VARCHAR(20) DEFAULT 'user' NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT
);

-- Courts table
CREATE TABLE courts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'US',
  sport_types TEXT[] NOT NULL,
  surface_type VARCHAR(50),
  court_count INTEGER,
  lighting BOOLEAN DEFAULT false,
  phone VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(255),
  hours_of_operation JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_place_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  data_source VARCHAR(50) DEFAULT 'manual'
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Court verifications table
CREATE TABLE court_verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  current_value TEXT,
  proposed_value TEXT NOT NULL,
  evidence TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved courts table
CREATE TABLE saved_courts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, court_id)
);

-- Court photos table
CREATE TABLE court_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review photos table
CREATE TABLE review_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_courts_sport_types ON courts USING GIN(sport_types);
CREATE INDEX idx_courts_location ON courts(latitude, longitude);
CREATE INDEX idx_courts_city_state ON courts(city, state);
CREATE INDEX idx_reviews_court_id ON reviews(court_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_verifications_status ON court_verifications(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_notification_settings ON users USING GIN(notification_settings);
```

### 3. Configure Row Level Security (RLS)
Run this SQL to set up secure access policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;

-- Users can view all public data
CREATE POLICY "Public courts are viewable by everyone" ON courts FOR SELECT USING (true);
CREATE POLICY "Public reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

-- Users can manage their own data
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Saved courts policies
CREATE POLICY "Users can manage their saved courts" ON saved_courts FOR ALL USING (auth.uid() = user_id);
```

### 4. Get Supabase Credentials
From your Supabase project dashboard:
1. Go to Settings > API
2. Copy your:
   - Project URL (`SUPABASE_URL`)
   - Anon public key (`REACT_APP_SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
3. Go to Settings > Database
4. Copy your database URL (`SUPABASE_DB_URL`)

## 🔧 Environment Configuration

### Server Environment Variables
Create a `.env` file in the `server/` directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# JWT Secret
JWT_SECRET=your-super-secure-jwt-secret-key

# Google APIs
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Server Configuration
PORT=5001
NODE_ENV=production
```

### Client Environment Variables
Create a `.env` file in the `client/` directory:

```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API Configuration
REACT_APP_API_URL=https://your-api-domain.com
```

## 🚀 Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend)

#### Frontend (Vercel):
1. Push your code to GitHub
2. Connect your repo to Vercel
3. Set build command: `cd client && npm run build`
4. Set output directory: `client/build`
5. Add environment variables in Vercel dashboard

#### Backend (Railway):
1. Connect your GitHub repo to Railway
2. Set root directory to `server/`
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

### Option 2: Full Stack on Netlify/Vercel + Serverless Functions

#### Using Vercel with API Routes:
1. Move server code to `api/` directory
2. Convert Express routes to Vercel serverless functions
3. Deploy as single project

### Option 3: Docker Deployment

Create `Dockerfile` for backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY server/ .

EXPOSE 5001

CMD ["npm", "start"]
```

## 📱 Google OAuth Setup for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `https://yourdomain.com`
   - `https://your-app.vercel.app`
6. Add authorized redirect URIs (not needed for the library we're using)

## 🔐 Security Checklist

- [ ] All environment variables are set correctly
- [ ] Database has Row Level Security enabled
- [ ] JWT secret is strong and unique
- [ ] Google OAuth origins are restricted to your domains
- [ ] CORS is configured for your production domains
- [ ] Rate limiting is enabled on authentication endpoints
- [ ] File uploads have size and type restrictions
- [ ] All user inputs are validated and sanitized

## 📊 Database Migration

If migrating from local PostgreSQL to Supabase:

1. Export your local data:
```bash
pg_dump your_local_db > backup.sql
```

2. Import to Supabase using the SQL editor or:
```bash
psql "postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres" < backup.sql
```

## 🔄 Post-Deployment Testing

1. Test user registration and login
2. Test Google OAuth integration
3. Test court search and discovery
4. Test review submission
5. Test photo uploads
6. Test admin verification workflow
7. Verify email notifications work
8. Test PWA installation

## 📈 Monitoring & Analytics

### Supabase Analytics
- Monitor database performance in Supabase dashboard
- Set up alerts for high resource usage
- Review query performance

### Application Monitoring
- Implement error tracking (e.g., Sentry)
- Set up uptime monitoring
- Monitor API response times

## 🔧 Troubleshooting

### Common Issues:

1. **Database connection errors**
   - Verify Supabase credentials
   - Check if IP is whitelisted (Supabase allows all by default)

2. **Authentication issues**
   - Verify JWT secret matches between environments
   - Check Google OAuth redirect URLs

3. **File upload issues**
   - Verify Supabase storage bucket is configured
   - Check file size limits

4. **Performance issues**
   - Enable database indexes
   - Implement caching for frequently accessed data
   - Optimize image sizes

## 🚀 Going Live

1. Purchase and configure custom domain
2. Set up SSL certificates (automatic with most hosts)
3. Configure CDN for static assets
4. Set up monitoring and alerts
5. Create backup strategy
6. Document API for potential future integrations

---

*This deployment guide covers the complete production setup for Rate Your Court using Supabase as the backend infrastructure.*