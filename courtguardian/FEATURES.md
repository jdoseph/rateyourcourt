# Rate Your Court - Complete Features & Functionality Documentation

## Overview
Rate Your Court is a comprehensive full-stack web application for discovering, reviewing, and managing sports courts across multiple sport types. Built with React frontend and Node.js/Express backend, it features advanced search capabilities, community-driven content, and administrative tools.

## 🏗️ Technical Architecture

### Frontend (React)
- **Framework:** Create React App with React Router for navigation
- **Styling:** Bootstrap 5 with custom CSS variables and semantic class organization
- **Authentication:** JWT tokens stored in localStorage with Google OAuth integration
- **State Management:** React hooks with context-aware user management
- **PWA Features:** Service worker, offline support, and install prompts

### Backend (Node.js/Express)
- **API Architecture:** RESTful API with modular route structure
- **Database:** PostgreSQL with connection pooling
- **Authentication:** JWT middleware with Google OAuth verification
- **Background Jobs:** Redis and Bull queue system for automated tasks
- **External APIs:** Google Places API for court discovery

### Database Schema
- **Users:** Authentication, profiles, roles, and OAuth integration
- **Courts:** Multi-sport venue data with verification tracking
- **Reviews:** User-generated ratings and feedback system
- **Verifications:** Community data correction and enhancement system

## 🚀 Core Features

### 1. User Authentication & Management

#### Traditional Authentication
- **User Registration** with comprehensive validation:
  - Username: 3-50 characters, alphanumeric + underscore/hyphen
  - Email: Valid format validation, max 100 characters
  - Password: 8-128 characters with strength requirements (uppercase, lowercase, number)
  - Real-time field validation with visual error indicators
  - Duplicate email/username prevention with specific error messages
  - Loading states and form submission feedback

- **User Login** with secure credential verification
- **JWT Token Management** with 7-day expiration
- **User Profile Management** with avatar customization and settings

#### Google OAuth Integration
- **Google Sign-In** for both registration and login
- **Automatic Account Creation** for new Google users
- **Token Verification** on backend with secure credential handling
- **Seamless Integration** with existing JWT authentication system

#### User Roles & Permissions
- **Regular Users:** Court discovery, reviews, verifications
- **Moderators:** Verification approval, content moderation
- **Administrators:** Full system access, user management

### 2. Court Discovery & Search System

#### Automated Court Discovery
- **Background Job System** using Redis and Bull queues
- **Google Places API Integration** for automated court discovery
- **Multi-Sport Support:** Tennis, Pickleball, Volleyball, Basketball, Badminton, Padel
- **Geographic Coverage:** Major cities across different regions
- **Scheduled Discovery Jobs** for continuous database updates

#### Advanced Search Capabilities
- **Fuzzy Search** powered by Fuse.js for intelligent relevance scoring
- **Multi-Sport Filtering** with sport-specific search options
- **Geographic Search** by city, state, or region
- **Real-time Search Results** with dynamic filtering
- **Search Result Optimization** with duplicate removal and ranking

#### Court Data Management
- **Comprehensive Court Profiles:**
  - Name, address, and contact information
  - Sport types and court counts
  - Surface types (hard court, clay, grass, etc.)
  - Lighting availability and operating hours
  - Photos and media galleries
  - Creation timestamps and data sources

### 3. Review & Rating System

#### User Reviews
- **Star Rating System** (1-5 stars) with half-star precision
- **Written Reviews** with rich text support
- **Photo Attachments** for review enhancement
- **Review Moderation** with admin oversight
- **User Review History** and management

#### Review Features
- **Review Aggregation** with average rating calculations
- **Review Sorting** by date, rating, and helpfulness
- **Review Validation** to prevent spam and duplicate reviews
- **Photo Upload Integration** with image optimization

### 4. Community Verification System

#### Data Verification Features
- **Community Submissions** for missing or incorrect court information
- **Field-Specific Verification:**
  - Surface type corrections
  - Court count updates
  - Lighting status verification
  - Contact information updates
  - Operating hours corrections

#### Admin Review Workflow
- **Verification Dashboard** for moderators and administrators
- **Batch Operations** for efficient approval/rejection
- **Verification Status Tracking** with pending, approved, rejected states
- **Statistics and Metrics** for community contribution tracking
- **Duplicate Prevention** with 24-hour submission limits

#### Verification Process
- **User Submission Interface** with structured forms
- **Evidence Requirements** for verification claims
- **Admin Review Tools** with detailed submission analysis
- **Automatic Status Updates** and user notifications
- **Verification History** for audit trails

### 5. User Interface & Experience

#### Responsive Design
- **Mobile-First Approach** with Bootstrap responsive grid
- **Touch-Friendly Interactions** for mobile devices
- **Adaptive Navigation** with collapsible menus
- **Cross-Platform Compatibility** across all major browsers

#### Enhanced Visual Elements
- **Creation Date Badges** with time-relative indicators ("Today", "3d ago")
- **Bootstrap Tooltip Integration** for enhanced user guidance
- **Toast Notification System** with 8-second display duration
- **Loading States** and progress indicators throughout the application
- **Visual Feedback** for all user interactions

#### Navigation & Routing
- **React Router Integration** with proper navigation handling
- **Breadcrumb Navigation** for complex page hierarchies
- **Deep Linking Support** for shareable court and review URLs
- **Back Button Handling** with browser history management

### 6. Progressive Web App (PWA) Features

#### PWA Capabilities
- **Service Worker Registration** for offline functionality
- **App Installation Prompts** for mobile and desktop
- **Offline Indicator** with connection status display
- **Caching Strategies** for improved performance
- **Background Sync** for data updates when online

#### Performance Optimization
- **Code Splitting** for faster initial load times
- **Image Optimization** with responsive image loading
- **Bundle Size Optimization** with tree shaking
- **Lazy Loading** for non-critical components

### 7. Administrative Features

#### Admin Dashboard
- **User Management** with role assignment and account control
- **Content Moderation** tools for reviews and submissions
- **System Analytics** with usage statistics and metrics
- **Bulk Operations** for efficient data management

#### Verification Management
- **Pending Verification Queue** with priority sorting
- **Verification Review Interface** with detailed submission data
- **Batch Approval/Rejection** tools for high-volume processing
- **Verification Statistics** and community contribution tracking

#### System Monitoring
- **Error Logging** with detailed stack traces
- **Performance Metrics** for API endpoints
- **Database Query Optimization** monitoring
- **User Activity Tracking** for system insights

## 🛠️ Development Features

### Code Organization
- **Component Architecture** with clear separation of concerns
- **Modular Route Structure** for maintainable backend code
- **CSS Class Organization** with semantic naming conventions
- **Reusable Components** for consistent UI patterns

### Recent Technical Improvements
- **CSS Refactoring:** Replaced 492+ inline styles with organized CSS classes
- **Component Optimization:** Improved parent/child component relationships
- **State Management:** Fixed React Hook dependencies and eliminated warnings
- **Error Handling:** Comprehensive error handling with user-friendly messages
- **Performance:** Optimized search functionality and reduced re-renders

### Testing & Quality Assurance
- **ESLint Integration** with comprehensive rule sets
- **React Testing Library** setup for component testing
- **Error Boundary Implementation** for graceful error handling
- **Accessibility Compliance** with ARIA labels and semantic HTML

## 🔧 Configuration & Environment

### Environment Variables
```bash
# Client (.env)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Server (.env)
DATABASE_URL=postgres://user@localhost:5432/rateyourcourt
JWT_SECRET=yourSuperSecretJWTKey
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Development Commands
```bash
# Client (React app)
cd client/
npm start      # Development server on http://localhost:3000
npm test       # Test suite in interactive watch mode
npm run build  # Production bundle

# Server (Node.js/Express API)
cd server/
npm start      # Production server
npm run dev    # Development server with auto-reload
```

## 📊 Database Schema

### Core Tables
- **users:** User accounts, authentication, profiles, and OAuth data
- **courts:** Sports venue information with multi-sport support
- **reviews:** User ratings and feedback with photo support
- **court_verifications:** Community data correction submissions
- **court_photos:** Image galleries for courts and reviews
- **saved_courts:** User bookmarking functionality

### Key Relationships
- Users can create multiple reviews and verifications
- Courts support multiple sport types and have many reviews
- Verifications track community-submitted data changes
- Photos are linked to both courts and reviews

## 🚦 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - User registration with validation
- `POST /login` - User authentication
- `POST /google` - Google OAuth verification

### Court Routes (`/api/courts`)
- `GET /` - List courts with search and filtering
- `GET /:id` - Get specific court details
- `POST /` - Create new court (admin)
- `PUT /:id` - Update court information (admin)
- `DELETE /:id` - Remove court (admin)

### Review Routes (`/api/courts/:courtId/reviews`)
- `GET /` - List reviews for a court
- `POST /` - Create new review
- `PUT /:reviewId` - Update review (author/admin)
- `DELETE /:reviewId` - Delete review (author/admin)

### Verification Routes (`/api/verifications`)
- `GET /` - List pending verifications (admin)
- `POST /` - Submit verification request
- `PUT /:id/approve` - Approve verification (admin)
- `PUT /:id/reject` - Reject verification (admin)

## 🔐 Security Features

### Authentication Security
- **JWT Token Validation** with expiration handling
- **Password Hashing** using bcrypt with salt rounds
- **Google OAuth Verification** with secure token validation
- **Rate Limiting** on authentication endpoints
- **Input Sanitization** for all user inputs

### Data Protection
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with input validation and sanitization
- **CORS Configuration** for secure cross-origin requests
- **Environment Variable Protection** for sensitive data

## 📱 User Experience Features

### Interactive Elements
- **Real-time Validation** with immediate feedback
- **Progressive Loading** for large data sets
- **Optimistic Updates** for better perceived performance
- **Error Recovery** with retry mechanisms
- **Graceful Degradation** for offline scenarios

### Accessibility
- **Keyboard Navigation** support throughout the application
- **Screen Reader Compatibility** with proper ARIA labels
- **High Contrast Support** for visual accessibility
- **Focus Management** for modal dialogs and dynamic content

## 📈 Analytics & Monitoring

### User Analytics
- **Usage Tracking** for feature adoption analysis
- **Performance Monitoring** for page load times
- **Error Tracking** with detailed error reports
- **User Journey Analysis** for UX optimization

### System Metrics
- **API Response Times** monitoring
- **Database Query Performance** tracking
- **Server Resource Usage** monitoring
- **Cache Hit Rates** for optimization insights

## 🔄 Future Roadmap

### Planned Features
- **Photo & Media System** for enhanced court profiles
- **Advanced Search Filters** with distance-based search
- **Social Features** with user follows and activity feeds
- **Mobile App Development** with React Native
- **Advanced Analytics Dashboard** for administrators

### Technical Improvements
- **GraphQL API** implementation for efficient data fetching
- **Real-time Updates** with WebSocket integration
- **Advanced Caching** with Redis implementation
- **Microservices Architecture** for scalability
- **Automated Testing** with comprehensive test coverage

---

*This documentation reflects the current state of Rate Your Court as of the latest updates, including Google OAuth integration, comprehensive validation systems, and enhanced user experience features.*