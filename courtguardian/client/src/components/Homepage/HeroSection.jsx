import React, { useState } from 'react';
import { ALLOWED_SPORTS } from '../../constants';

export default function HeroSection({ searchTerm, setSearchTerm, handleSearchKeyPress }) {
  const [selectedSport, setSelectedSport] = useState('All Sports');


  // Enhanced search handler
  const handleEnhancedSearch = () => {
    if (!searchTerm.trim()) return;
    
    let searchUrl = `/search?q=${encodeURIComponent(searchTerm.trim())}`;
    
    if (selectedSport !== 'All Sports') {
      searchUrl += `&sport=${encodeURIComponent(selectedSport)}`;
    }
    
    window.location.href = searchUrl;
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleEnhancedSearch();
    }
  };

  return (
    <div className="section-card hero-section">
      <div className="hero-logo">
        <img src="single-line-logo.svg" alt="RYC - Rate Your Courts" />
      </div>
      <h2 className="hero-title">
        Find Your Perfect Court
      </h2>
      <p className="hero-subtitle">
        Discover and review sports courts in your community
      </p>
      
      {/* Enhanced Search Container */}
      <div className="search-container">
        {/* Sport Type Selector */}
        <div className="search-form-group">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="form-select"
          >
            <option value="All Sports">All Sports</option>
            {ALLOWED_SPORTS.map(sport => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="search-input-group">
          <input
            type="search"
            placeholder={selectedSport === 'All Sports' ? 
              "Search by court name or location" : 
              `Search for ${selectedSport} courts by name or location`
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            className="search-input form-input"
          />
          <button
            onClick={handleEnhancedSearch}
            disabled={!searchTerm.trim()}
            className="btn-primary-custom"
          >
            <i className="bi bi-search" />
            Search
          </button>
        </div>

        {/* Quick Search Suggestions */}
        <div className="quick-search-suggestions">
          <span className="quick-search-label">Quick searches:</span>
          {['Tennis Park', 'Pickleball Courts', 'Beach Volleyball'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setSearchTerm(suggestion)}
              className="quick-search-button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}