import React, { useState, useEffect } from 'react';
import CourtSearchDiscovery from '../Discovery/CourtSearchDiscovery';
import { getUserProfile, getToken } from '../../api';
import '../../App.css';

export default function DiscoverySection() {
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const profile = await getUserProfile();
          if (!profile.error && profile.user) {
            setUser(profile.user);
            setIsLoggedIn(true);
          } else {
            // Invalid token, clear state
            setUser(null);
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        // No token, clear state
        setUser(null);
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();

    // Listen for storage changes (like when logout removes the token)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        checkAuth();
      }
    };

    // Listen for custom login/logout events
    const handleLogin = () => {
      checkAuth();
    };

    const handleLogout = () => {
      setUser(null);
      setIsLoggedIn(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('login', handleLogin);
    window.addEventListener('logout', handleLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('login', handleLogin);
      window.removeEventListener('logout', handleLogout);
    };
  }, []);

  // Show discovery section for everyone, but with different features

  const isAdmin = user?.role === 'admin';


  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: '3rem 1rem',
      marginTop: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            {isAdmin ? 'Court Discovery & Management' : 'Advanced Court Search'}
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: '#6b7280',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            {isAdmin 
              ? 'Search existing courts, suggest new ones, or discover courts using Google Places API.' 
              : isLoggedIn
                ? 'Search for courts by location, suggest new courts, and help grow our community.'
                : 'Search for courts by location. Sign up to suggest courts and unlock advanced features.'}
          </p>
          
          {!showDiscovery && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowDiscovery(true)}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: isAdmin ? '#f59e0b' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = isAdmin ? '#d97706' : '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = isAdmin ? '#f59e0b' : '#3b82f6'}
              >
                {isAdmin ? '🗺️ Open Admin Tools' : '🔍 Search Courts'}
              </button>
              
              {!isLoggedIn && (
                <button
                  onClick={() => window.location.href = '/login'}
                  style={{
                    padding: '1rem 2rem',
                    backgroundColor: 'white',
                    color: '#3b82f6',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = '#3b82f6';
                  }}
                >
                  🚀 Sign Up for More Features
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search/Discovery Interface */}
        {showDiscovery && (
          <div style={{ marginBottom: '3rem' }}>
            <CourtSearchDiscovery />
          </div>
        )}


        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginTop: '3rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Location-Based Search
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Find courts near you using location coordinates and filter by sport type and distance.
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Suggest New Courts
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Know of a court that's not in our database? Suggest it and help grow our community.
            </p>
          </div>

          {isAdmin && (
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                Google Places Discovery
              </h3>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Admin-only: Automatically discover new courts using Google's comprehensive database.
              </p>
            </div>
          )}

          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Quality Assurance
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              All courts are verified and maintained to ensure accuracy and relevance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}