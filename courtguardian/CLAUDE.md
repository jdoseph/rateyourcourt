# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Client (React app)
Navigate to `client/` directory:
- `npm start` - Run development server on http://localhost:3000
- `npm test` - Run test suite in interactive watch mode  
- `npm run build` - Build production bundle

### Server (Node.js/Express API)
Navigate to `server/` directory:
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon auto-reload

## Architecture Overview

CourtGuardian is a full-stack web application for finding and reviewing sports courts. It uses a client-server architecture:

**Frontend (React)**
- Created with Create React App, uses React Router for navigation
- Bootstrap for styling with custom CSS variables
- JWT token stored in localStorage for authentication
- API client in `src/api.js` handles all backend communication
- Components are organized in `src/components/` directory

**Backend (Express/Node.js)**
- RESTful API with JWT authentication middleware
- PostgreSQL database with connection pooling
- Background job system using Redis and Bull queue for court discovery
- Modular route structure:
  - `/api/auth` - User registration/login
  - `/api/courts` - Court CRUD operations
  - `/api/courts/:courtId/reviews` - Nested reviews
  - `/api/verifications` - Court data verification system

**Database Schema**
- Uses PostgreSQL with tables for users, courts, reviews, and court_verifications
- Courts support multiple sport types (pickleball, tennis, volleyball, basketball, badminton, padel)
- Reviews are linked to courts and include ratings
- Court verification system tracks community-submitted data corrections and additions

## Key Configuration

- Client proxy configured to `http://localhost:5001` in package.json
- Server runs on port 5001 (configurable via PORT env var)
- Database connection via `DATABASE_URL` environment variable
- JWT authentication requires `JWT_SECRET` environment variable

## Development Workflow

1. Start the backend server first (`cd server && npm run dev`)
2. Start the frontend in a separate terminal (`cd client && npm start`)
3. Frontend automatically proxies API calls to the backend
4. Both support hot reloading during development

## Recently Implemented Features

### Court Discovery System
- **Automated Court Discovery**: Background job system that discovers courts from Google Places API
- **Multi-Sport Support**: Discovers courts for all supported sports (tennis, pickleball, volleyball, basketball, badminton, padel)
- **Geographic Coverage**: Automated discovery for major cities across different regions
- **Fuzzy Search**: Implemented Fuse.js for intelligent search with relevance scoring
- **Creation Date Badges**: Time-based visual indicators showing when courts were added to the database

### Court Verification System
- **Community Data Verification**: Users can submit corrections and additions for missing court information
- **Admin Review Workflow**: Moderators can approve/reject verification submissions
- **Field-Specific Verification**: Supports verification of surface type, court count, lighting, contact info, and hours
- **Verification Status Tracking**: Courts display verification status and missing field indicators
- **Duplicate Prevention**: System prevents duplicate submissions within 24-hour periods

### UI/UX Improvements
- **Enhanced Search Results**: Removed redundant duplicate search sections, improved court card navigation
- **Bootstrap Tooltip Integration**: Replaced basic HTML tooltips with professional Bootstrap components
- **Creation Date Badges**: Color-coded badges showing "Today", "3d ago", etc. instead of generic "New" labels
- **Improved Navigation**: Court cards now use React Router Link components for proper navigation
- **Toast Notification System**: Reliable 8-second toast notifications for user feedback
- **Responsive Design**: Enhanced mobile and desktop experience across all components

### Technical Improvements
- **Component Architecture**: Improved separation of concerns between parent/child components
- **State Management**: Fixed toast timing issues by moving state management to stable parent components
- **Error Handling**: Comprehensive error handling and user feedback throughout the application
- **Performance**: Optimized search functionality and removed unnecessary re-renders
- **Code Quality**: Fixed React Hook dependencies and eliminated console warnings

### Admin Features
- **Verification Dashboard**: Admin interface for reviewing pending court verifications
- **Batch Operations**: Efficient approval/rejection of multiple verification submissions
- **Statistics Tracking**: Verification metrics and community contribution tracking
- **User Management**: Enhanced user roles and permissions system