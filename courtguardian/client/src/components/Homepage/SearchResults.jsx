import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ALLOWED_SPORTS, API_BASE_URL } from '../../constants';
import Fuse from 'fuse.js';

function highlightMatch(text, query) {
  if (!query) return text;
  
  // For fuzzy search, try to highlight individual words that match
  const queryWords = query.toLowerCase().split(/\s+/);
  let result = text;
  
  queryWords.forEach(word => {
    if (word.length >= 2) {
      // Create a more flexible regex that handles partial matches
      const regex = new RegExp(`(${word.split('').join('.*?')})`, 'gi');
      const simpleRegex = new RegExp(`(${word})`, 'gi');
      
      // First try exact word match, then fuzzy
      if (simpleRegex.test(result)) {
        result = result.split(simpleRegex).map((part, i) =>
          simpleRegex.test(part) ? `<mark style="background-color: #e3f2fd; color: #1565c0">${part}</mark>` : part
        ).join('');
      }
    }
  });
  
  // Convert string back to JSX
  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}

function CourtCard({ court, query }) {
  const getMissingFieldsCount = () => {
    const fields = [
      court.surface_type,
      court.court_count,
      court.lighting,
      court.phone_number,
      court.website_url,
      court.opening_hours
    ];
    return fields.filter(field => field === null || field === undefined || field === '' || field === '?').length;
  };

  const missingFieldsCount = getMissingFieldsCount();
  const needsVerification = missingFieldsCount > 0 || court.verification_status === 'pending';

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
          <div 
            style={{
              backgroundColor: badgeColor,
              color: 'white',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '500',
              cursor: 'help'
            }}
          >
            {badgeText}
          </div>
        </OverlayTrigger>
      );
    }
    
    return null;
  };

  return (
    <Link
      to={`/courts/${court.id}`}
      style={{
        display: 'block',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            fontWeight: '600',
            color: '#1f2937',
            lineHeight: '1.3',
            marginBottom: '0.25rem'
          }}>
            {highlightMatch(court.name, query)}
          </h3>
          {needsVerification && (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip>
                  {missingFieldsCount > 0 ? 
                    `Missing ${missingFieldsCount} detail${missingFieldsCount > 1 ? 's' : ''} (surface, lighting, etc.). Help us complete this court's info!` :
                    'Pending verification by moderators'}
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
                ⚠️ {missingFieldsCount > 0 ? `${missingFieldsCount} missing` : 'Needs verification'}
              </span>
            </OverlayTrigger>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getCreationBadge(court)}
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip>
                {(Number(court.average_rating) || 0).toFixed(1)}/5 stars from {court.review_count || 0} review{(court.review_count || 0) !== 1 ? 's' : ''}
              </Tooltip>
            }
          >
            <div 
              style={{
                backgroundColor: Number(court.average_rating) >= 4 ? '#10b981' : Number(court.average_rating) >= 3 ? '#f59e0b' : '#ef4444',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                minWidth: '2.5rem',
                textAlign: 'center',
                cursor: 'help'
              }}
            >
              {(Number(court.average_rating) || 0).toFixed(1)}
            </div>
          </OverlayTrigger>
        </div>
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ 
          color: '#6b7280', 
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          {highlightMatch(court.sport_type || 'Sports Court', query)}
        </span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          color: '#9ca3af', 
          fontSize: '0.85rem' 
        }}>
          {court.court_count || 1} court{(court.court_count || 1) !== 1 ? 's' : ''} • {court.surface_type || 'Unknown surface'}
          {court.distance && (
            <span style={{ 
              marginLeft: '0.5rem',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              padding: '0.125rem 0.375rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              📍 {court.distance.toFixed(1)} km away
            </span>
          )}
        </span>
        <span style={{ 
          color: '#9ca3af', 
          fontSize: '0.85rem' 
        }}>
          {highlightMatch(court.address || 'Address not available', query)}
        </span>
      </div>
      
      <div style={{ 
        marginTop: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            color: '#f59e0b', 
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            ★ {(Number(court.average_rating) || 0).toFixed(1)}
          </span>
        </div>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip>
              Click to read {court.review_count || 0} review{(court.review_count || 0) !== 1 ? 's' : ''}
            </Tooltip>
          }
        >
          <div 
            style={{
              backgroundColor: '#4285f4',
              color: 'white',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'help'
            }}
          >
            {court.review_count || 0} reviews
          </div>
        </OverlayTrigger>
      </div>
    </Link>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const sport = searchParams.get('sport') || '';
  const lat = parseFloat(searchParams.get('lat')) || null;
  const lng = parseFloat(searchParams.get('lng')) || null;
  
  const [courts, setCourts] = useState([]);
  const [filteredCourts, setFilteredCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New search state
  const [newSearchTerm, setNewSearchTerm] = useState(query);
  const [newSelectedSport, setNewSelectedSport] = useState(sport || 'All Sports');

  // Handle new search
  const handleNewSearch = () => {
    if (!newSearchTerm.trim()) return;
    
    let searchUrl = `/search?q=${encodeURIComponent(newSearchTerm.trim())}`;
    
    if (newSelectedSport !== 'All Sports') {
      searchUrl += `&sport=${encodeURIComponent(newSelectedSport)}`;
    }
    
    navigate(searchUrl);
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNewSearch();
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  useEffect(() => {
    async function fetchCourts() {
      try {
        // If we have location parameters, use the location-based search
        if (lat && lng) {
          const searchUrl = `${API_BASE_URL}/courts/search?latitude=${lat}&longitude=${lng}&radius=50000${sport && sport !== 'All Sports' ? `&sportType=${encodeURIComponent(sport)}` : ''}`;
          const res = await fetch(searchUrl);
          if (!res.ok) throw new Error('Failed to fetch courts');
          const data = await res.json();
          setCourts(data.courts || []);
        } else {
          // Otherwise, fetch all courts and filter by sport if specified
          const courtUrl = sport && sport !== 'All Sports' 
            ? `${API_BASE_URL}/courts?sport_type=${encodeURIComponent(sport)}`
            : '${API_BASE_URL}/courts';
          const res = await fetch(courtUrl);
          if (!res.ok) throw new Error('Failed to fetch courts');
          const data = await res.json();
          setCourts(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCourts();
  }, [sport, lat, lng]);

  useEffect(() => {
    let filtered = courts;

    // Fuzzy text-based filtering
    if (query) {
      // Configure Fuse.js for fuzzy searching
      const fuseOptions = {
        keys: [
          { name: 'name', weight: 0.5 },           // Court name is most important
          { name: 'sport_type', weight: 0.3 },     // Sport type is second priority
          { name: 'address', weight: 0.2 }         // Address is lowest priority
        ],
        threshold: 0.4,        // 0.0 = perfect match, 1.0 = match anything
        distance: 100,         // How far to search for patterns
        minMatchCharLength: 2, // Minimum character length to trigger search
        includeScore: true,    // Include relevance scores
        shouldSort: true,      // Sort by relevance
        ignoreLocation: true,  // Don't care about pattern position
        findAllMatches: true   // Find all matching patterns
      };

      const fuse = new Fuse(courts, fuseOptions);
      const fuseResults = fuse.search(query);
      
      // Extract items from Fuse.js results (with scores)
      filtered = fuseResults.map(result => ({
        ...result.item,
        fuseScore: result.score
      }));

      // If fuzzy search returns no results, fall back to basic includes search
      if (filtered.length === 0) {
        const queryNoSpaces = query.toLowerCase().replace(/\s/g, '');
        filtered = courts.filter(court =>
          (court.name && court.name.toLowerCase().replace(/\s/g, '').includes(queryNoSpaces)) ||
          (court.sport_type && court.sport_type.toLowerCase().replace(/\s/g, '').includes(queryNoSpaces)) ||
          (court.address && court.address.toLowerCase().replace(/\s/g, '').includes(queryNoSpaces))
        );
      }
    }

    // Add distance information if we have user location
    if (lat && lng) {
      filtered = filtered.map(court => ({
        ...court,
        distance: court.latitude && court.longitude 
          ? calculateDistance(lat, lng, court.latitude, court.longitude)
          : null
      }));

      // Sort by distance if we have location, otherwise keep fuzzy search ranking
      if (lat && lng) {
        filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }
    }

    setFilteredCourts(filtered);
  }, [query, courts, lat, lng]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="rounded page-container">
      <div className="container-main">
        
        {/* Header Section */}
        <div className="card-default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link 
              to="/"
              className="link-back"
            >
              ← Back to Home
            </Link>
          </div>
          
          <h1 className="text-primary-heading">
            Search Results
          </h1>
          
          {/* New Search Form */}
          <div className="card-light">
            <h3 className="text-secondary-heading">
              Search Again
            </h3>
            
            <div className="search-form-row">
              {/* Sport Selector */}
              <select
                value={newSelectedSport}
                onChange={(e) => setNewSelectedSport(e.target.value)}
                className="form-select"
              >
                <option value="All Sports">All Sports</option>
                {ALLOWED_SPORTS.map(sportOption => (
                  <option key={sportOption} value={sportOption}>{sportOption}</option>
                ))}
              </select>
              
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search by court name or location"
                value={newSearchTerm}
                onChange={(e) => setNewSearchTerm(e.target.value)}
                onKeyDown={handleKeyPress}
                className="form-input"
              />
              
              {/* Search Button */}
              <button
                onClick={handleNewSearch}
                disabled={!newSearchTerm.trim()}
                className="btn-primary-custom"
                style={{ padding: '0.5rem 1rem' }}
              >
                Search
              </button>
            </div>
          </div>
          
          <div className="filter-tags">
            {sport && sport !== 'All Sports' && (
              <span className="badge-primary">
                🏸 {sport}
              </span>
            )}
            {query && (
              <span style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '16px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                🔍 "{query}"
              </span>
            )}
          </div>
          
          <p style={{ 
            color: '#6b7280', 
            margin: 0,
            fontSize: '1rem'
          }}>
            {filteredCourts.length} court{filteredCourts.length !== 1 ? 's' : ''} found
            {lat && lng && filteredCourts.length > 0 && ' (sorted by distance)'}
          </p>
        </div>

        {/* Search Results */}
        {!query && !sport && !lat && !lng ? (
          <div className="empty-state">
            <h2 className="empty-state-heading">
              No search parameters provided
            </h2>
            <p className="empty-state-text">
              Please use the search form to find courts.
            </p>
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state-heading">
              No courts found
            </h2>
            <p className="empty-state-text">
              Try adjusting your search terms or browse all courts on the home page.
            </p>
          </div>
        ) : (
          <div className="grid-auto">
            {filteredCourts.map((court) => (
              <CourtCard key={court.id} court={court} query={query} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}