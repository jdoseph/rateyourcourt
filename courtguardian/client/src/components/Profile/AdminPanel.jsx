import React, { useState, useEffect } from 'react';
import { getToken } from '../../api';
import { ALLOWED_SPORTS, API_BASE_URL } from '../../constants';
import Toast from '../Toast/Toast';
import JobMonitor from '../Admin/JobMonitor';
import '../../App.css';

export default function   AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('discovery');
  const [suggestions, setSuggestions] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState({
    pendingSuggestions: 0,
    totalCourts: 0,
    discoveredThisMonth: 0
  });
  const [verificationStats, setVerificationStats] = useState({
    pendingVerifications: 0,
    totalVerifications: 0,
    courtsNeedingVerification: 0
  });
  const [processingVerifications, setProcessingVerifications] = useState(new Set());

  // Court management state
  const [allCourts, setAllCourts] = useState([]);
  const [courtSearchTerm, setCourtSearchTerm] = useState('');
  const [courtSportFilter, setCourtSportFilter] = useState('');
  const [deletingCourt, setDeletingCourt] = useState(null);

  // Discovery-related state
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' });
  const [radius, setRadius] = useState(5000);
  const [sportType, setSportType] = useState('Tennis');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState(null);
  const [showAllDiscoveryCourts, setShowAllDiscoveryCourts] = useState(false);

  useEffect(() => {
    fetchAdminStats();
    fetchVerificationStats();
    if (activeTab === 'suggestions') {
      fetchCourtSuggestions();
    } else if (activeTab === 'verifications') {
      fetchPendingVerifications();
    } else if (activeTab === 'management') {
      fetchAllCourts();
    }
  }, [activeTab]);

  const fetchAdminStats = async () => {
    try {
      const token = getToken();
      
      // Get basic court statistics
      const courtsResponse = await fetch(`${API_BASE_URL}/courts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let totalCourts = 0;
      if (courtsResponse.ok) {
        const courtsData = await courtsResponse.json();
        totalCourts = courtsData.courts ? courtsData.courts.length : 0;
      }
      
      // Get pending suggestions count
      let pendingSuggestions = 0;
      try {
        const suggestionsResponse = await fetch(`${API_BASE_URL}/discovery/admin/suggestions?status=pending`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json();
          pendingSuggestions = suggestionsData.suggestions ? suggestionsData.suggestions.length : 0;
        }
      } catch (err) {
        console.log('Suggestions endpoint not available');
      }
      
      // Get popular areas for discovery stats
      let discoveredThisMonth = 0;
      try {
        const areasResponse = await fetch(`${API_BASE_URL}/admin/jobs/popular-areas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (areasResponse.ok) {
          const areasData = await areasResponse.json();
          // Count recent discoveries (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          discoveredThisMonth = areasData.areas ? areasData.areas.filter(area => 
            new Date(area.last_discovered) > thirtyDaysAgo
          ).length : 0;
        }
      } catch (err) {
        console.log('Popular areas endpoint not available');
      }
      
      setStats({
        pendingSuggestions,
        totalCourts,
        discoveredThisMonth
      });
      
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Fallback to default values
      setStats({
        pendingSuggestions: 0,
        totalCourts: 0,
        discoveredThisMonth: 0
      });
    }
  };

  // Court Management Functions
  const fetchAllCourts = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const url = new URL(`${API_BASE_URL}/courts`);
      
      // Add search filters
      if (courtSearchTerm) {
        url.searchParams.append('searchTerm', courtSearchTerm);
      }
      if (courtSportFilter) {
        url.searchParams.append('sport_type', courtSportFilter);
      }
      url.searchParams.append('limit', '200'); // Get more courts for admin management
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const courts = await response.json();
        setAllCourts(Array.isArray(courts) ? courts : courts.courts || []);
      } else {
        console.error('Failed to fetch courts:', response.status);
        setAllCourts([]);
      }
    } catch (error) {
      console.error('Error fetching courts:', error);
      setAllCourts([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCourt = async (courtId, courtName) => {
    if (!window.confirm(`Are you sure you want to delete "${courtName}"? This action cannot be undone and will remove all associated reviews, photos, and user data.`)) {
      return;
    }
    
    setDeletingCourt(courtId);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/courts/${courtId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setToast({
          show: true,
          message: `Court "${courtName}" deleted successfully`,
          type: 'success'
        });
        
        // Remove the court from the local state
        setAllCourts(prev => prev.filter(court => court.id !== courtId));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalCourts: Math.max(0, prev.totalCourts - 1)
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete court');
      }
    } catch (error) {
      console.error('Error deleting court:', error);
      setToast({
        show: true,
        message: error.message || 'Failed to delete court',
        type: 'error'
      });
    } finally {
      setDeletingCourt(null);
    }
  };

  const fetchCourtSuggestions = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/discovery/admin/suggestions?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const reviewSuggestion = async (suggestionId, status, adminNotes = '') => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/discovery/admin/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          adminNotes,
          createCourt: status === 'approved'
        })
      });

      if (response.ok) {
        setToast({
          show: true,
          message: `Suggestion ${status} successfully!`,
          type: 'success'
        });
        fetchCourtSuggestions(); // Refresh the list
      } else {
        throw new Error('Failed to review suggestion');
      }
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      setToast({
        show: true,
        message: 'Failed to review suggestion',
        type: 'error'
      });
    }
  };

  // Geocode address to get coordinates
  const geocodeAddress = async (addressToGeocode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/discovery/geocode`, {
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
      setToast({ show: true, message: 'Geolocation is not supported by this browser', type: 'error' });
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
          const response = await fetch(`${API_BASE_URL}/discovery/reverse-geocode`, {
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
        setToast({ show: true, message: 'Unable to get your location. Please enter an address manually.', type: 'error' });
        setUseCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Admin: Discover new courts
  const discoverCourts = async () => {
    if (!address.trim()) {
      setToast({ show: true, message: 'Please provide an address', type: 'error' });
      return;
    }

    setLoading(true);
    setDiscoveryResults(null);
    setShowAllDiscoveryCourts(false);

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
      const response = await fetch(`${API_BASE_URL}/discovery/admin/discover`, {
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

      setDiscoveryResults(data);
      setShowAllDiscoveryCourts(false); // Reset to show only first 5 courts
      
      if (data.fromCache) {
        setToast({ show: true, message: 'Courts loaded from recent search', type: 'info' });
      } else {
        setToast({ 
          show: true, 
          message: `Discovered ${data.stats.new} new courts, ${data.stats.total} total found!`, 
          type: 'success' 
        });
      }

    } catch (error) {
      console.error('Discovery error:', error);
      setToast({ show: true, message: error.message, type: 'error' });
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

  // Fetch verification statistics
  const fetchVerificationStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/verifications/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerificationStats({
          pendingVerifications: parseInt(data.pending_count) || 0,
          totalVerifications: parseInt(data.total_verifications) || 0,
          courtsNeedingVerification: parseInt(data.courts_needing_verification) || 0
        });
      } else {
        // Fallback to default values
        setVerificationStats({
          pendingVerifications: 0,
          totalVerifications: 0,
          courtsNeedingVerification: 0
        });
      }
    } catch (error) {
      console.error('Error fetching verification stats:', error);
      // Fallback to default values
      setVerificationStats({
        pendingVerifications: 0,
        totalVerifications: 0,
        courtsNeedingVerification: 0
      });
    }
  };

  // Fetch pending verifications
  const fetchPendingVerifications = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/verifications/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerifications(data.pendingVerifications || []);
      } else {
        console.error('Failed to fetch verifications:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Review a verification (approve/reject)
  const reviewVerification = async (verificationId, action, adminNotes = '') => {
    try {
      const token = getToken();
      
      // Mark this verification as being processed
      setProcessingVerifications(prev => new Set([...prev, verificationId]));
      
      const response = await fetch(`${API_BASE_URL}/verifications/admin/${verificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          adminNotes
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Remove the verification from the UI after successful processing
        setVerifications(prev => prev.filter(v => v.id !== verificationId));
        
        // Update stats without re-fetching the entire list
        setVerificationStats(prev => ({
          ...prev,
          pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
          totalVerifications: prev.totalVerifications + 1
        }));
        
        setToast({
          show: true,
          message: `Verification saved successfully!`,
          type: 'success'
        });
      } else {
        let errorMessage = 'Failed to review verification';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use status-based message
          if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later or contact support.';
          } else if (response.status === 404) {
            errorMessage = 'Verification not found. It may have already been processed.';
          } else if (response.status === 403) {
            errorMessage = 'Permission denied. Please check your admin privileges.';
          } else {
            errorMessage = `Server returned error ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error reviewing verification:', error);
      setToast({
        show: true,
        message: error.message || 'Failed to review verification',
        type: 'error'
      });
    } finally {
      // Remove from processing set regardless of success/failure
      setProcessingVerifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(verificationId);
        return newSet;
      });
    }
  };

  // Format field display name
  const getFieldDisplayName = (fieldName) => {
    const names = {
      'surface_type': 'Surface Type',
      'court_count': 'Number of Courts',
      'lighting': 'Lighting',
      'phone_number': 'Phone Number',
      'website_url': 'Website',
      'opening_hours': 'Opening Hours',
      'address': 'Address',
      'name': 'Court Name'
    };
    return names[fieldName] || fieldName;
  };

  const tabs = [
    { id: 'discovery', label: 'Court Discovery', icon: '🗺️' },
    { id: 'suggestions', label: 'Review Suggestions', icon: '💡' },
    { id: 'verifications', label: `Verify Data (${verificationStats.pendingVerifications})`, icon: '✅' },
    { id: 'management', label: 'Court Management', icon: '🗂️' },
    { id: 'jobs', label: 'Background Jobs', icon: '⚙️' },
    { id: 'stats', label: 'Statistics', icon: '📊' }
  ];

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: '600' }}>
              Admin Panel
            </h4>
            <p style={{ margin: 0, color: '#b45309', fontSize: '0.875rem' }}>
              You have admin privileges. Use these tools responsibly to manage courts and review user suggestions.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '2rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 1.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === tab.id ? '#f59e0b' : '#6b7280',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'discovery' && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Court Discovery
          </h3>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
              <strong>⚠️ Admin Tool:</strong> This will search Google Places API and add new courts to the database.
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
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Enter city, state, or full address (e.g., 'San Francisco, CA' or '123 Main St, New York, NY')"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input"
                  style={{ 
                    flex: 1, 
                    minWidth: '250px',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
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

          {/* Discovery Results */}
          {discoveryResults && (
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Discovery Results
              </h4>

              {discoveryResults.stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                      {discoveryResults.stats.total || discoveryResults.courts?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Found</div>
                  </div>
                  {discoveryResults.stats.new !== undefined && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {discoveryResults.stats.new}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>New Courts</div>
                    </div>
                  )}
                  {discoveryResults.stats.duplicates !== undefined && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                        {discoveryResults.stats.duplicates}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Duplicates</div>
                    </div>
                  )}
                </div>
              )}

              {discoveryResults.courts && discoveryResults.courts.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {(showAllDiscoveryCourts ? discoveryResults.courts : discoveryResults.courts.slice(0, 5)).map((court, index) => (
                    <div key={court.id || index} style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
                          {court.name}
                        </h5>
                        {court.discovery_source === 'google_places' && (
                          <span style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                        📍 {court.address}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <div><strong>Surface:</strong> {formatCourtValue(court.surface_type, 'surface')}</div>
                        <div><strong>Courts:</strong> {formatCourtValue(court.court_count, 'count')}</div>
                        <div><strong>Lighting:</strong> {formatCourtValue(court.lighting, 'lighting')}</div>
                        {court.google_rating && (
                          <div><strong>Rating:</strong> ⭐ {court.google_rating}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {discoveryResults.courts.length > 5 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      {showAllDiscoveryCourts ? (
                        <button
                          onClick={() => setShowAllDiscoveryCourts(false)}
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
                          onClick={() => setShowAllDiscoveryCourts(true)}
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
                          Show All {discoveryResults.courts.length} Courts
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
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Court Suggestions ({suggestions.length})
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Review and approve user-submitted court suggestions.
          </p>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1rem', color: '#6b7280' }}>Loading suggestions...</div>
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
              <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#1f2937' }}>All caught up!</h4>
              <p style={{ margin: 0, color: '#6b7280' }}>No pending court suggestions to review.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {suggestions.map(suggestion => (
                <div key={suggestion.id} style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        {suggestion.name}
                      </h4>
                      <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        📍 {suggestion.address}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        <span><strong>Sport:</strong> {suggestion.sport_types}</span>
                        <span><strong>Suggested by:</strong> {suggestion.suggested_by_username}</span>
                        <span><strong>Date:</strong> {new Date(suggestion.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      Pending
                    </span>
                  </div>
                  
                  {suggestion.description && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem', lineHeight: '1.5' }}>
                        <strong>Description:</strong> {suggestion.description}
                      </p>
                    </div>
                  )}
                  
                  {suggestion.contact_info && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem' }}>
                        <strong>Contact:</strong> {suggestion.contact_info}
                      </p>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <button
                      onClick={() => reviewSuggestion(suggestion.id, 'rejected')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => reviewSuggestion(suggestion.id, 'approved')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Approve & Create Court
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'verifications' && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Data Verification ({verifications.length})
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Review and approve user-submitted court data corrections and additions.
          </p>
          
          {/* Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e', marginBottom: '0.25rem' }}>
                {verificationStats.pendingVerifications}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Pending Reviews</div>
            </div>
            
            <div style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #16a34a',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534', marginBottom: '0.25rem' }}>
                {verificationStats.totalVerifications}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#14532d' }}>Total Verifications</div>
            </div>
            
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.25rem' }}>
                {verificationStats.courtsNeedingVerification}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Courts Need Data</div>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1rem', color: '#6b7280' }}>Loading verifications...</div>
            </div>
          ) : verifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
              <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#1f2937' }}>All caught up!</h4>
              <p style={{ margin: 0, color: '#6b7280' }}>No pending data verifications to review.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {verifications.map(verification => {
                const isProcessing = processingVerifications.has(verification.id);
                return (
                <div key={verification.id} style={{
                  backgroundColor: isProcessing ? '#f8fafc' : 'white',
                  border: isProcessing ? '1px solid #cbd5e1' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  opacity: isProcessing ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        {verification.court_name}
                      </h4>
                      <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        📍 {verification.court_address}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        fontSize: '0.875rem', 
                        color: '#6b7280', 
                        marginTop: '0.5rem', 
                        flexWrap: 'wrap',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <span><strong>Field:</strong> {getFieldDisplayName(verification.field_name)}</span>
                        <span><strong>By:</strong> {verification.contributor_name || 'Anonymous'}</span>
                        <span><strong>Date:</strong> {new Date(verification.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      marginLeft: '1rem'
                    }}>
                      {verification.verification_type}
                    </span>
                  </div>
                  
                  {/* Verification Details */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {verification.old_value !== null && (
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Current Value:</span>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280',
                            fontStyle: verification.old_value ? 'normal' : 'italic',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}>
                            {verification.old_value || 'None (missing data)'}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Suggested Value:</span>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          color: '#059669',
                          fontWeight: '500',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          {(() => {
                            const value = verification.new_value;
                            
                            // Handle sport_types JSON string format like {"tennis"}
                            if (verification.field_name === 'sport_types' && typeof value === 'string') {
                              try {
                                const parsed = JSON.parse(value);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  return parsed[0];
                                } else if (typeof parsed === 'string') {
                                  return parsed;
                                }
                              } catch (e) {
                                // If JSON parsing fails, treat as regular string
                                return value;
                              }
                            }
                            
                            if (Array.isArray(value)) {
                              return value[0] || 'Empty array';
                            }
                            
                            return value;
                          })()}
                        </div>
                      </div>
                      
                      {verification.notes && (
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Notes:</span>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280', 
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}>
                            {verification.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <button
                      onClick={() => reviewVerification(verification.id, 'reject')}
                      disabled={isProcessing}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: isProcessing ? '#9ca3af' : '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={(e) => !isProcessing && (e.target.style.backgroundColor = '#dc2626')}
                      onMouseLeave={(e) => !isProcessing && (e.target.style.backgroundColor = '#ef4444')}
                    >
                      {isProcessing ? '⏳ Processing...' : '❌ Reject'}
                    </button>
                    <button
                      onClick={() => reviewVerification(verification.id, 'approve')}
                      disabled={isProcessing}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={(e) => !isProcessing && (e.target.style.backgroundColor = '#059669')}
                      onMouseLeave={(e) => !isProcessing && (e.target.style.backgroundColor = '#10b981')}
                    >
                      {isProcessing ? '⏳ Processing...' : '✅ Approve & Update'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'management' && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Court Management
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Search, view, and manage all courts in the database.
          </p>

          {/* Search and Filter Controls */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '0.875rem'
                }}>
                  Search Courts
                </label>
                <input
                  type="text"
                  placeholder="Search by name or address..."
                  value={courtSearchTerm}
                  onChange={(e) => setCourtSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontSize: '0.875rem'
                }}>
                  Filter by Sport
                </label>
                <select
                  value={courtSportFilter}
                  onChange={(e) => setCourtSportFilter(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="">All Sports</option>
                  {ALLOWED_SPORTS.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={fetchAllCourts}
              disabled={loading}
              className="form-button"
              style={{
                width: 'auto',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                background: loading ? '#9ca3af' : '#3b82f6'
              }}
            >
              {loading ? 'Searching...' : '🔍 Search Courts'}
            </button>
          </div>

          {/* Courts List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1rem', color: '#6b7280' }}>Loading courts...</div>
            </div>
          ) : allCourts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <span style={{ fontSize: '3rem' }}>🏟️</span>
              <h4 style={{ margin: '1rem 0 0.5rem 0', color: '#1f2937' }}>No courts found</h4>
              <p style={{ margin: 0, color: '#6b7280' }}>Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div>
              <div style={{ 
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                Showing {allCourts.length} courts
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {allCourts.map(court => (
                  <div key={court.id} style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                          {court.name}
                        </h4>
                        <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                          📍 {court.address || 'No address provided'}
                        </p>
                        <div style={{ 
                          display: 'flex', 
                          gap: '1rem', 
                          fontSize: '0.875rem', 
                          color: '#6b7280', 
                          marginTop: '0.5rem',
                          flexWrap: 'wrap',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <span><strong>Sports:</strong> {court.sport_types || 'Not specified'}</span>
                          <span><strong>Surface:</strong> {court.surface_type || 'Unknown'}</span>
                          <span><strong>Courts:</strong> {court.court_count || 'Unknown'}</span>
                          <span><strong>Reviews:</strong> {court.review_count || 0}</span>
                          {court.average_rating > 0 && (
                            <span><strong>Rating:</strong> ⭐ {parseFloat(court.average_rating).toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <button
                        onClick={() => window.open(`/courts/${court.id}`, '_blank')}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                      >
                        🔍 View Court
                      </button>
                      <button
                        onClick={() => deleteCourt(court.id, court.name)}
                        disabled={deletingCourt === court.id}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: deletingCourt === court.id ? '#9ca3af' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: deletingCourt === court.id ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.3s ease'
                        }}
                        onMouseEnter={(e) => deletingCourt !== court.id && (e.target.style.backgroundColor = '#dc2626')}
                        onMouseLeave={(e) => deletingCourt !== court.id && (e.target.style.backgroundColor = '#ef4444')}
                      >
                        {deletingCourt === court.id ? '⏳ Deleting...' : '🗑️ Delete Court'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <JobMonitor />
      )}

      {activeTab === 'stats' && (
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Admin Statistics
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Overview of court database and user activity.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.5rem' }}>
                {stats.pendingSuggestions}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pending Suggestions</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem' }}>
                {stats.totalCourts}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Courts</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                {stats.discoveredThisMonth}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Discovered This Month</div>
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              Admin Tools Coming Soon
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280' }}>
              <li>User management</li>
              <li>Court verification workflow</li>
              <li>Bulk court operations</li>
              <li>Analytics dashboard</li>
              <li>Export data tools</li>
            </ul>
          </div>
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