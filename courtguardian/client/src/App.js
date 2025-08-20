import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginModal from './components/Login/LoginModal';
import RegisterModal from './components/Login/RegisterModal';
import CourtDetails from './components/Court/CourtDetails';
import HomePage from './components/Homepage/HomePage';
import SearchResults from './components/Homepage/SearchResults';
import AppUserProfile from './components/Profile/AppUserProfile';
import UserProfile from './components/Profile/UserProfile';
import PWAInstallBanner from './components/PWA/PWAInstallBanner';
import OfflineIndicator from './components/PWA/OfflineIndicator';
import { getToken, logout as logoutHelper, getUserProfile } from './api';
import { initializePWA } from './utils/pwa';

function App() {
  const [user, setUser] = useState(null);
  const [courts, setCourts] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const handleLogout = () => {
    logoutHelper();
    setUser(null);
    setAuthLoading(false); // Ensure we're not stuck in loading state
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // Load user profile on app start if token exists
  useEffect(() => {
    const loadUserProfile = async () => {
      const token = getToken();
      if (token) {
        try {
          const data = await getUserProfile();
          if (!data.error && data.user) {
            setUser(data.user);
          } else {
            // Token might be expired or invalid, remove it
            console.warn('Failed to load user profile, removing token');
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Remove potentially invalid token
          localStorage.removeItem('token');
        }
      }
      // Always set loading to false after attempting to load
      setAuthLoading(false);
    };

    loadUserProfile();
    
    // Initialize PWA features
    initializePWA();
  }, []); // Remove user dependency to prevent re-runs

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Router>
        <div>
          <nav
            className="app-nav py-3 rounded-4 d-flex align-items-center justify-content-between flex-nowrap"
          >
            <Link className="flex-shrink-0" to="/" style={{marginLeft:'1.5rem'}}>
              <img src="/icon-logo.svg" alt="RYC logo" className="app-logo" />
            </Link>
            
            <div className="d-flex align-items-center flex-shrink-0" style={{marginRight:'1.5rem'}}>
              {authLoading ? (
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : user ? (
                <div className='d-flex gap-2'>
                  <AppUserProfile user={user} onLogout={handleLogout}/>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn login-button"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Login
                  </button>
                  <button
                    className="btn register-button"
                    onClick={() => setShowRegisterModal(true)}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </nav>

          <Routes>
            <Route path="/" element={<HomePage courts={courts} />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/courts/:id" element={<CourtDetailsWrapper user={user} />} />
            <Route path="/profile" element={<UserProfile user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            <Route path="/courtlist" />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>

          <LoginModal
            show={showLoginModal}
            onHide={() => setShowLoginModal(false)}
            onLogin={(userData) => {
              setUser(userData);
              setShowLoginModal(false);
              setAuthLoading(false); // Ensure loading state is reset
            }}
          />

          <RegisterModal show={showRegisterModal}
            onHide={() => setShowRegisterModal(false)}
            onRegister={(userData) => {
              setUser(userData);
              setShowRegisterModal(false);
              setAuthLoading(false); // Ensure loading state is reset
            }}
          />

          {/* PWA Components */}
          <OfflineIndicator />
          <PWAInstallBanner />

        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

function CourtDetailsWrapper({ user }) {
  const { id } = useParams();
  if (!id || id.trim().length === 0) return <p>Invalid court ID.</p>;
  return <CourtDetails courtId={id} user={user} />;
}

export default App;
