import React, { useState, useEffect } from 'react';
import { ALLOWED_SPORTS } from '../../constants';
import Toast from '../Toast/Toast';
import '../../App.css';

export default function CourtDiscovery({ onCourtsDiscovered }) {
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [radius, setRadius] = useState(5000);
  const [sportType, setSportType] = useState('Tennis');
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [showAllCourts, setShowAllCourts] = useState(false);

  // Get user's current location
  const getCurrentLocation = () => {
    setUseCurrentLocation(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setUseCurrentLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        });
        setUseCurrentLocation(false);
        setToast({ show: true, message: 'Location detected successfully!', type: 'success' });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Unable to get your location. Please enter coordinates manually.');
        setUseCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Discover courts
  const discoverCourts = async () => {
    if (!location.latitude || !location.longitude) {
      setError('Please provide location coordinates');
      return;
    }

    setDiscovering(true);
    setError(null);
    setResults(null);
    setShowAllCourts(false);

    try {
      const response = await fetch('${API_BASE_URL}/discovery/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
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

      // Notify parent component
      if (onCourtsDiscovered) {
        onCourtsDiscovered(data.courts);
      }

    } catch (error) {
      console.error('Discovery error:', error);
      setError(error.message);
    } finally {
      setDiscovering(false);
    }
  };

  // Format court data for display with placeholders
  const formatCourtValue = (value, field) => {
    if (value === null || value === undefined || value === '?') {
      return <span className="discovery-court-unknown">Unknown</span>;
    }
    
    if (field === 'lighting') {
      return value ? 'Available' : 'Not Available';
    }
    
    return value;
  };

  return (
    <div className="discovery-container">
      <h2 className="discovery-title">
        🔍 Discover Courts
      </h2>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="discovery-form-grid">
        {/* Location Input */}
        <div>
          <label className="discovery-label">
            Location
          </label>
          <div className="discovery-location-row">
            <div className="discovery-location-inputs">
              <input
                type="number"
                placeholder="Latitude"
                value={location.latitude}
                onChange={(e) => setLocation({ ...location, latitude: e.target.value })}
                className="form-input discovery-location-input"
                step="any"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={location.longitude}
                onChange={(e) => setLocation({ ...location, longitude: e.target.value })}
                className="form-input discovery-location-input"
                step="any"
              />
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={useCurrentLocation}
              className={`form-button discovery-location-button ${
                useCurrentLocation ? 'discovery-location-button-loading' : 'discovery-location-button-active'
              }`}
            >
              {useCurrentLocation ? 'Getting Location...' : '📍 Use Current Location'}
            </button>
          </div>
        </div>

        {/* Sport Type and Radius */}
        <div className="discovery-form-row">
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

        {/* Discover Button */}
        <button
          onClick={discoverCourts}
          disabled={discovering || !location.latitude || !location.longitude}
          className={`form-button discovery-button ${
            discovering ? 'discovery-button-loading' : 'discovery-button-active'
          }`}
        >
          {discovering ? (
            <>
              <div className="spinner-border spinner-border-sm discovery-spinner" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Discovering Courts...
            </>
          ) : (
            <>
              🔍 Discover {sportType} Courts
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="discovery-results">
          <h3 className="discovery-results-title">
            Discovery Results
          </h3>

          {results.stats && (
            <div className="discovery-stats-grid">
              <div className="discovery-stat-item">
                <div className="discovery-stat-number discovery-stat-number-total">
                  {results.stats.total}
                </div>
                <div className="discovery-stat-label">Total Found</div>
              </div>
              <div className="discovery-stat-item">
                <div className="discovery-stat-number discovery-stat-number-new">
                  {results.stats.new}
                </div>
                <div className="discovery-stat-label">New Courts</div>
              </div>
              <div className="discovery-stat-item">
                <div className="discovery-stat-number discovery-stat-number-duplicates">
                  {results.stats.duplicates}
                </div>
                <div className="discovery-stat-label">Duplicates</div>
              </div>
            </div>
          )}

          {results.courts && results.courts.length > 0 ? (
            <div className="discovery-courts-grid">
              {(showAllCourts ? results.courts : results.courts.slice(0, 5)).map((court, index) => (
                <div key={court.id || index} className="discovery-court-card">
                  <div className="discovery-court-header">
                    <h4 className="discovery-court-title">
                      {court.name}
                    </h4>
                    {court.discovery_source === 'google_places' && (
                      <span className="discovery-court-badge">
                        New
                      </span>
                    )}
                  </div>
                  <div className="discovery-court-address">
                    📍 {court.address}
                  </div>
                  <div className="discovery-court-details">
                    <div><strong>Surface:</strong> {formatCourtValue(court.surface_type, 'surface')}</div>
                    <div><strong>Courts:</strong> {formatCourtValue(court.court_count, 'count')}</div>
                    <div><strong>Lighting:</strong> {formatCourtValue(court.lighting, 'lighting')}</div>
                    {court.google_rating && (
                      <div><strong>Rating:</strong> ⭐ {court.google_rating}</div>
                    )}
                  </div>
                </div>
              ))}
              {results.courts.length > 5 && (
                <div className="discovery-show-toggle">
                  {showAllCourts ? (
                    <button
                      onClick={() => setShowAllCourts(false)}
                      className="discovery-show-less-button"
                    >
                      Show Less
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAllCourts(true)}
                      className="discovery-show-more-button"
                    >
                      Show All {results.courts.length} Courts
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="discovery-empty-state">
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