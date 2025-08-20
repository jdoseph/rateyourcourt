import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ALLOWED_SPORTS, API_BASE_URL } from '../../constants';
import Toast from '../Toast/Toast';
import { getUserProfile, getToken } from '../../api';
import '../../App.css';

export default function CourtSearchDiscovery({ onCourtsDiscovered }) {
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' });
  const [radius, setRadius] = useState(5000);
  const [sportType, setSportType] = useState(ALLOWED_SPORTS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [showAllCourts, setShowAllCourts] = useState(false);
  const [mode, setMode] = useState('search'); // 'search' or 'discover' or 'suggest'

  // Fetch user profile to check role
  useEffect(() => {
    const checkUserRole = async () => {
      const token = getToken();
      if (token) {
        try {
          const profile = await getUserProfile();
          if (!profile.error && profile.user) {
            setUser(profile.user);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    checkUserRole();

    // Listen for storage changes, login and logout events
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        checkUserRole();
      }
    };

    const handleLogin = () => {
      checkUserRole();
    };

    const handleLogout = () => {
      setUser(null);
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

  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;

  // Geocode address to get coordinates
  const geocodeAddress = async (addressToGeocode) => {
    try {
      const response = await fetch('${API_BASE_URL}/discovery/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: addressToGeocode })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to geocode address');
      }
      
      const data = await response.json();
      setCoordinates({
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString()
      });
      return { lat: data.latitude, lng: data.longitude };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setUseCurrentLocation(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setUseCurrentLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCoordinates({
          latitude: lat.toString(),
          longitude: lng.toString()
        });
        
        // Reverse geocode to get address
        try {
          const response = await fetch('${API_BASE_URL}/discovery/reverse-geocode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude: lat, longitude: lng })
          });
          
          if (response.ok) {
            const data = await response.json();
            setAddress(data.formatted_address);
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        }
        
        setUseCurrentLocation(false);
        setToast({ show: true, message: 'Location detected successfully!', type: 'success' });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to get your location. Please enter an address manually.');
        setUseCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Search existing courts
  const searchCourts = async () => {
    if (!address.trim()) {
      setError('Please provide an address');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setShowAllCourts(false);

    try {
      // First geocode the address if we don't have coordinates
      let lat, lng;
      if (!coordinates.latitude || !coordinates.longitude) {
        setToast({ show: true, message: 'Converting address to coordinates...', type: 'info' });
        const coords = await geocodeAddress(address);
        lat = coords.lat;
        lng = coords.lng;
      } else {
        lat = parseFloat(coordinates.latitude);
        lng = parseFloat(coordinates.longitude);
      }

      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        radius: radius.toString(),
        sportType,
        ...(searchTerm && { searchTerm })
      });

      const response = await fetch(`${API_BASE_URL}/courts/search?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search courts');
      }

      setResults(data);
      setShowAllCourts(false); // Reset to show only first 5 courts
      setToast({ 
        show: true, 
        message: `Found ${data.courts.length} courts in your area!`, 
        type: 'success' 
      });

      if (onCourtsDiscovered) {
        onCourtsDiscovered(data.courts);
      }

    } catch (error) {
      console.error('Search error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Discover new courts
  const discoverCourts = async () => {
    if (!address.trim()) {
      setError('Please provide an address');
      return;
    }

    if (!isAdmin) {
      setError('Admin access required for court discovery');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setShowAllCourts(false);

    try {
      // First geocode the address if we don't have coordinates
      let lat, lng;
      if (!coordinates.latitude || !coordinates.longitude) {
        setToast({ show: true, message: 'Converting address to coordinates...', type: 'info' });
        const coords = await geocodeAddress(address);
        lat = coords.lat;
        lng = coords.lng;
      } else {
        lat = parseFloat(coordinates.latitude);
        lng = parseFloat(coordinates.longitude);
      }

      const token = getToken();
      const response = await fetch('${API_BASE_URL}/discovery/admin/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          radius: parseInt(radius),
          sportType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover courts');
      }

      setResults(data);
      setShowAllCourts(false); // Reset to show only first 5 courts
      
      if (data.fromCache) {
        setToast({ show: true, message: 'Courts loaded from recent search', type: 'info' });
      } else {
        setToast({ 
          show: true, 
          message: `Discovered ${data.stats.new} new courts, ${data.stats.total} total found!`, 
          type: 'success' 
        });
      }

      if (onCourtsDiscovered) {
        onCourtsDiscovered(data.courts);
      }

    } catch (error) {
      console.error('Discovery error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // User: Suggest a new court
  const [suggestion, setSuggestion] = useState({
    name: '',
    address: '',
    sportType: ALLOWED_SPORTS[0],
    description: '',
    contactInfo: ''
  });

  const submitCourtSuggestion = async () => {
    if (!suggestion.name || !suggestion.address) {
      setError('Name and address are required');
      return;
    }

    if (!user) {
      setError('Please log in to suggest a court');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch('${API_BASE_URL}/courts/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...suggestion,
          latitude: coordinates.latitude ? parseFloat(coordinates.latitude) : null,
          longitude: coordinates.longitude ? parseFloat(coordinates.longitude) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit suggestion');
      }

      setToast({ 
        show: true, 
        message: 'Court suggestion submitted successfully! Admins will review it soon.', 
        type: 'success' 
      });

      // Reset form
      setSuggestion({
        name: '',
        address: '',
        sportType: ALLOWED_SPORTS[0],
        description: '',
        contactInfo: ''
      });

    } catch (error) {
      console.error('Suggestion error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format court data for display
  const formatCourtValue = (value, field) => {
    if (value === null || value === undefined || value === '?') {
      return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unknown</span>;
    }
    
    if (field === 'lighting') {
      return value ? 'Available' : 'Not Available';
    }
    
    return value;
  };

  // Check if court is recently created and get appropriate badge
  const getCreationBadge = (court) => {
    if (!court.created_at) return null;
    
    const createdDate = new Date(court.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show badge for courts created in the last 30 days
    if (diffDays <= 30) {
      let badgeText, badgeColor;
      
      if (diffDays === 1) {
        badgeText = 'Today';
        badgeColor = '#10b981'; // Green
      } else if (diffDays <= 3) {
        badgeText = `${diffDays}d ago`;
        badgeColor = '#10b981'; // Green
      } else if (diffDays <= 7) {
        badgeText = `${diffDays}d ago`;
        badgeColor = '#3b82f6'; // Blue
      } else if (diffDays <= 14) {
        badgeText = `${diffDays}d ago`;
        badgeColor = '#f59e0b'; // Orange
      } else {
        badgeText = `${diffDays}d ago`;
        badgeColor = '#6b7280'; // Gray
      }
      
      return (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip>
              Added {badgeText === 'Today' ? 'today' : badgeText}
            </Tooltip>
          }
        >
          <span 
            style={{
              backgroundColor: badgeColor,
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: 'help'
            }}
          >
            {badgeText}
          </span>
        </OverlayTrigger>
      );
    }
    
    return null;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '2rem',
      border: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <h2 style={{
        margin: '0 0 1.5rem 0',
        fontSize: '1.75rem',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        🏟️ Court Search & Discovery
      </h2>

      {/* Mode Selection */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode('search')}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: mode === 'search' ? '#3b82f6' : 'white',
            color: mode === 'search' ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          🔍 Search Courts
        </button>
        
        {user ? (
          <button
            onClick={() => setMode('suggest')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: mode === 'suggest' ? '#10b981' : 'white',
              color: mode === 'suggest' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            💡 Suggest Court
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #10b981',
              borderRadius: '8px',
              background: 'white',
              color: '#10b981',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🔐 Login to Suggest Courts
          </button>
        )}
        
        {isAdmin && (
          <button
            onClick={() => setMode('discover')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: mode === 'discover' ? '#f59e0b' : 'white',
              color: mode === 'discover' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🗺️ Admin Discovery
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Search Mode */}
      {mode === 'search' && (
        <div>
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Address Input */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Address
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter city, state, or full address (e.g., 'San Francisco, CA')"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, minWidth: '300px' }}
                />
                <button
                  onClick={getCurrentLocation}
                  disabled={useCurrentLocation}
                  className="form-button"
                  style={{
                    width: 'auto',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    background: useCurrentLocation ? '#9ca3af' : '#4285f4'
                  }}
                >
                  {useCurrentLocation ? 'Getting Location...' : '📍 Use Current Location'}
                </button>
              </div>
              {coordinates.latitude && coordinates.longitude && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  📍 Coordinates: {parseFloat(coordinates.latitude).toFixed(4)}, {parseFloat(coordinates.longitude).toFixed(4)}
                </div>
              )}
            </div>

            {/* Search Term */}
            <div>
              <label className="form-label">Search Term (optional)</label>
              <input
                type="text"
                placeholder="Court name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Sport Type and Radius */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">Sport Type</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  className="form-input"
                >
                  {ALLOWED_SPORTS.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Search Radius</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="form-input"
                >
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={20000}>20 km</option>
                </select>
              </div>
            </div>

            <button
              onClick={searchCourts}
              disabled={loading || !address.trim()}
              className="form-button"
              style={{
                width: 'auto',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading ? '#9ca3af' : '#3b82f6'
              }}
            >
              {loading ? 'Searching...' : `🔍 Search ${sportType} Courts`}
            </button>
          </div>
        </div>
      )}

      {/* Suggest Mode */}
      {mode === 'suggest' && (
        <div>
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label className="form-label">Court Name *</label>
              <input
                type="text"
                placeholder="e.g., Central Park Tennis Courts"
                value={suggestion.name}
                onChange={(e) => setSuggestion({ ...suggestion, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Address *</label>
              <input
                type="text"
                placeholder="Full address including city and state"
                value={suggestion.address}
                onChange={(e) => setSuggestion({ ...suggestion, address: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Sport Type</label>
              <select
                value={suggestion.sportType}
                onChange={(e) => setSuggestion({ ...suggestion, sportType: e.target.value })}
                className="form-input"
              >
                {ALLOWED_SPORTS.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Location (optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Latitude"
                  value={coordinates.latitude}
                  onChange={(e) => setCoordinates({ ...coordinates, latitude: e.target.value })}
                  className="form-input"
                  step="any"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={coordinates.longitude}
                  onChange={(e) => setCoordinates({ ...coordinates, longitude: e.target.value })}
                  className="form-input"
                  step="any"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Description (optional)</label>
              <textarea
                placeholder="Additional details about the court..."
                value={suggestion.description}
                onChange={(e) => setSuggestion({ ...suggestion, description: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>

            <div>
              <label className="form-label">Contact Info (optional)</label>
              <input
                type="text"
                placeholder="Phone number or website"
                value={suggestion.contactInfo}
                onChange={(e) => setSuggestion({ ...suggestion, contactInfo: e.target.value })}
                className="form-input"
              />
            </div>

            <button
              onClick={submitCourtSuggestion}
              disabled={loading || !suggestion.name || !suggestion.address}
              className="form-button"
              style={{
                width: 'auto',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading ? '#9ca3af' : '#10b981'
              }}
            >
              {loading ? 'Submitting...' : '💡 Submit Suggestion'}
            </button>
          </div>
        </div>
      )}

      {/* Admin Discovery Mode */}
      {mode === 'discover' && isAdmin && (
        <div>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
              <strong>⚠️ Admin Mode:</strong> This will search Google Places API and add new courts to the database.
            </p>
          </div>
          
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Address Input */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Address
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter city, state, or full address (e.g., 'San Francisco, CA')"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                  style={{ flex: 1, minWidth: '300px' }}
                />
                <button
                  onClick={getCurrentLocation}
                  disabled={useCurrentLocation}
                  className="form-button"
                  style={{
                    width: 'auto',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    background: useCurrentLocation ? '#9ca3af' : '#4285f4'
                  }}
                >
                  {useCurrentLocation ? 'Getting Location...' : '📍 Use Current Location'}
                </button>
              </div>
              {coordinates.latitude && coordinates.longitude && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  📍 Coordinates: {parseFloat(coordinates.latitude).toFixed(4)}, {parseFloat(coordinates.longitude).toFixed(4)}
                </div>
              )}
            </div>

            {/* Sport Type and Radius */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">Sport Type</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  className="form-input"
                >
                  {ALLOWED_SPORTS.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Search Radius</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="form-input"
                >
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={20000}>20 km</option>
                </select>
              </div>
            </div>

            <button
              onClick={discoverCourts}
              disabled={loading || !address.trim()}
              className="form-button"
              style={{
                width: 'auto',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: loading ? '#9ca3af' : '#f59e0b'
              }}
            >
              {loading ? 'Discovering...' : `🗺️ Discover ${sportType} Courts`}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {mode === 'search' ? 'Search Results' : 'Discovery Results'}
          </h3>

          {results.stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                  {results.stats.total || results.courts?.length || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Found</div>
              </div>
              {results.stats.new !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {results.stats.new}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>New Courts</div>
                </div>
              )}
              {results.stats.duplicates !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {results.stats.duplicates}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Duplicates</div>
                </div>
              )}
            </div>
          )}

          {results.courts && results.courts.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {(showAllCourts ? results.courts : results.courts.slice(0, 5)).map((court, index) => (
                <Link 
                  key={court.id || index} 
                  to={court.id ? `/courts/${court.id}` : '#'}
                  style={{
                    display: 'block',
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: court.id ? 'pointer' : 'default'
                  }}
                  onMouseEnter={(e) => {
                    if (court.id) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (court.id) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  onClick={(e) => {
                    if (!court.id) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {court.name}
                      </h4>
                      {(() => {
                        const missingFields = [
                          court.surface_type,
                          court.court_count,
                          court.lighting,
                          court.phone_number,
                          court.website_url,
                          court.opening_hours
                        ].filter(field => field === null || field === undefined || field === '' || field === '?').length;
                        
                        return missingFields > 0 && (
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip>
                                Missing {missingFields} detail{missingFields > 1 ? 's' : ''} (surface, lighting, etc.). Help us complete this court's info!
                              </Tooltip>
                            }
                          >
                            <span 
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                border: '1px solid #f59e0b',
                                display: 'inline-block',
                                cursor: 'help'
                              }}
                            >
                              ⚠️ {missingFields} missing
                            </span>
                          </OverlayTrigger>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getCreationBadge(court)}
                      {court.id && (
                        <span style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          View Details →
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    📍 {court.address}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <div><strong>Surface:</strong> {formatCourtValue(court.surface_type, 'surface')}</div>
                    <div><strong>Courts:</strong> {formatCourtValue(court.court_count, 'count')}</div>
                    <div><strong>Lighting:</strong> {formatCourtValue(court.lighting, 'lighting')}</div>
                    {court.google_rating && (
                      <div><strong>Rating:</strong> ⭐ {court.google_rating}</div>
                    )}
                  </div>
                </Link>
              ))}
              {results.courts.length > 5 && (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  {showAllCourts ? (
                    <button
                      onClick={() => setShowAllCourts(false)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    >
                      Show Less
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAllCourts(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
                    >
                      Show All {results.courts.length} Courts
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No courts found in this area. Try expanding your search radius.
            </div>
          )}
        </div>
      )}

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}