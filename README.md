# Rate Your Court 🏟️
A comprehensive full-stack web application for discovering, reviewing, and managing sports courts across multiple sport types.

## ✨ Features

- **Multi-Sport Court Discovery** - Find courts for tennis, pickleball, volleyball, basketball, badminton, and padel
- **User Authentication** - Traditional email/password and Google OAuth integration
- **Community Reviews** - Rate and review courts with photo uploads
- **Court Verification System** - Community-driven data correction and enhancement
- **Progressive Web App** - Install on mobile and desktop devices
- **Admin Dashboard** - Comprehensive moderation and analytics tools
- **Real-time Search** - Fuzzy search with intelligent relevance scoring
- **Automated Discovery** - Background jobs to discover new courts via Google Places API

## 🏗️ Tech Stack

### Frontend
- **React** - Modern UI library with hooks
- **Bootstrap 5** - Responsive design framework
- **React Router** - Client-side routing
- **PWA** - Service worker and offline support

### Backend
- **Node.js/Express** - RESTful API server
- **PostgreSQL** - Primary database
- **Supabase** - Cloud database and authentication
- **Redis** - Background job processing
- **JWT** - Secure authentication tokens

### External APIs
- **Google Places** - Automated court discovery
- **Google OAuth** - Social authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL (local development)
- Google Cloud Console account (for APIs)

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/rateyourcourt.git
cd rateyourcourt
```

2. **Install dependencies**
```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

3. **Set up environment variables**
```bash
# Copy example files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit with your actual values
```

4. **Start development servers**
```bash
# Backend (from server directory)
npm run dev

# Frontend (from client directory)  
npm start
```

Visit `http://localhost:3000` to see the application.

## 🌐 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive production setup instructions using Supabase.

## 📖 Documentation

- [Features Documentation](./FEATURES.md) - Complete feature overview
- [Deployment Guide](./DEPLOYMENT.md) - Production setup with Supabase
- [Development Guide](./CLAUDE.md) - Development instructions and architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
