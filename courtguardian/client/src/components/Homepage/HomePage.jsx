import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from './HeroSection';
import CourtCarousel from './CourtCarousel';
import InfoSection from './InfoSection';
import CallToActionSection from './CallToActionSection';
import DiscoverySection from './DiscoverySection';
import { API_BASE_URL } from '../../constants';
import '../../App.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch courts from backend
  useEffect(() => {
    async function fetchCourts() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const res = await fetch(`${API_BASE_URL}/courts`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error('Failed to fetch courts');
        const data = await res.json();
        setCourts(data);
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Request timeout - please try again');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchCourts();
  }, []);

  // Handle search on Enter key press
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Sort courts by rating (descending) and take top 10
  const featuredCourts = [...courts]
    .sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0))
    .slice(0, 10);

  // Sort courts by review count (descending) and take top 10
  const recentCourts = [...courts]
    .sort((a, b) => (Number(b.review_count) || 0) - (Number(a.review_count) || 0))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="loading-container">
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
    <div className="homepage-container">
      <div className="homepage-content">
        <HeroSection 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleSearchKeyPress={handleSearchKeyPress}
        />
        
        <CourtCarousel 
          courts={featuredCourts}
          title="Top Rated Courts"
          showRating={true}
          showReviews={false}
          carouselId="featuredCourtsCarousel"
        />
        
        <CourtCarousel 
          courts={recentCourts}
          title="Most Reviewed Courts"
          showRating={false}
          showReviews={true}
          carouselId="recentCourtsCarousel"
        />
        
        <DiscoverySection />
        
        <InfoSection />
        
        <CallToActionSection />
      </div>
    </div>
  );
}