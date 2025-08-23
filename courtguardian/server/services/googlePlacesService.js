const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    
    if (!this.apiKey) {
      console.warn('❌ Google Places API key not found. Court discovery will be disabled.');
      console.warn('Please set GOOGLE_PLACES_API_KEY in your .env file');
    }
  }

  // Sport type mappings to Google Places search terms
  getSportSearchTerms(sportType) {
    const searchTerms = {
      'Tennis': ['tennis court', 'tennis club', 'tennis center'],
      'Pickleball': ['pickleball court', 'pickleball club', 'pickleball center'],
      'Basketball': ['basketball court', 'basketball gym', 'sports complex'],
      'Volleyball': ['volleyball court', 'volleyball club', 'beach volleyball'],
      'Badminton': ['badminton court', 'badminton club', 'badminton center'],
      'Padel': ['padel court', 'padel club', 'padel center']
    };
    
    return searchTerms[sportType] || [sportType.toLowerCase() + ' court'];
  }

  // Search for courts near a location
  async searchCourts(latitude, longitude, radius = 5000, sportType) {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // console.log(`🔍 Searching for ${sportType} courts near ${latitude}, ${longitude} within ${radius}m`);
    
    const searchTerms = this.getSportSearchTerms(sportType);
    // console.log(`📝 Using search terms:`, searchTerms);
    
    const allResults = [];

    try {
      // Search with each term to get comprehensive results
      for (const term of searchTerms) {
        // console.log(`🔎 Searching for: "${term}"`);
        const results = await this.performTextSearch(term, latitude, longitude, radius);
        // console.log(`📊 Found ${results.length} results for "${term}"`);
        allResults.push(...results);
      }

      // console.log(`🔢 Total raw results: ${allResults.length}`);

      // Remove duplicates based on place_id
      const uniqueResults = this.deduplicateResults(allResults);
      // console.log(`🎯 Unique results after deduplication: ${uniqueResults.length}`);
      
      // Filter and validate results
      const validatedResults = await this.validateSearchResults(uniqueResults, sportType);
      // console.log(`✅ Final validated results: ${validatedResults.length}`);
      
      return validatedResults;
    } catch (error) {
      console.error('Error searching courts:', error);
      throw error;
    }
  }

  // Perform text search using Google Places API
  async performTextSearch(query, latitude, longitude, radius) {
    const url = `${this.baseUrl}/textsearch/json`;
    const params = {
      query,
      location: `${latitude},${longitude}`,
      radius,
      key: this.apiKey,
      type: 'establishment'
    };

    // console.log(`🌐 Making API request to: ${url}`);
    // console.log(`📍 Query params:`, params);

    try {
      const response = await axios.get(url, { params });
      
      // console.log(`📡 API Response status: ${response.data.status}`);
      // console.log(`📈 Results count: ${response.data.results?.length || 0}`);
      
      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error(`❌ Google Places API error: ${response.data.status}`);
        console.error(`📋 Error details:`, response.data);
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      if (response.data.status === 'ZERO_RESULTS') {
        // console.log(`⚠️ No results found for query: "${query}"`);
      }

      return response.data.results || [];
    } catch (error) {
      console.error('Text search error:', error);
      if (error.response) {
        console.error('API Error Response:', error.response.data);
      }
      throw error;
    }
  }

  // Get detailed information about a place
  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const url = `${this.baseUrl}/details/json`;
    const params = {
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,opening_hours,price_level,photos,types,business_status',
      key: this.apiKey
    };

    try {
      const response = await axios.get(url, { params });
      
      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Place details error:', error);
      throw error;
    }
  }

  // Remove duplicate results based on place_id
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.place_id)) {
        return false;
      }
      seen.add(result.place_id);
      return true;
    });
  }

  // Validate search results to ensure they're relevant courts
  async validateSearchResults(results, sportType) {
    const validatedResults = [];
//     console.log(`🔍 Starting validation of ${results.length} results for ${sportType}`);

    for (const [index, result] of results.entries()) {
      try {
//         console.log(`📋 Validating result ${index + 1}/${results.length}: ${result.name} (${result.place_id})`);
        
        // Get detailed information
        const details = await this.getPlaceDetails(result.place_id);
//         console.log(`📄 Got details for: ${details.name}`);
        
        // Basic validation
        const isValid = this.isValidCourt(details, sportType);
//         console.log(`✓ Validation result: ${isValid ? 'VALID' : 'INVALID'} for ${details.name}`);
        
        if (!isValid) {
//           console.log(`❌ Skipping ${details.name} - failed validation`);
          continue;
        }

        // Transform to our court format
        const courtData = this.transformToCourtData(details, sportType);
        validatedResults.push(courtData);
//         console.log(`✅ Added ${courtData.name} to validated results`);
        
        // Add small delay to respect rate limits
        await this.sleep(100);
      } catch (error) {
        console.error(`❌ Error validating result ${result.place_id}:`, error);
        continue;
      }
    }

//     console.log(`🏁 Validation complete: ${validatedResults.length} valid courts found`);
    return validatedResults;
  }

  // Check if a place is likely a valid court
  isValidCourt(placeDetails, sportType) {
//     console.log(`🔍 Validating: ${placeDetails.name}`);
//     console.log(`📊 Business status: ${placeDetails.business_status}`);
//     console.log(`🏷️ Types: ${placeDetails.types?.join(', ')}`);
    
    // Check if business is operational
    if (placeDetails.business_status === 'CLOSED_PERMANENTLY') {
//       console.log(`❌ Business permanently closed`);
      return false;
    }

    // Blacklist filter - exclude obvious non-court businesses
    const name = placeDetails.name.toLowerCase();
    const address = (placeDetails.formatted_address || '').toLowerCase();
    const combinedText = `${name} ${address}`;
    
    const blacklistTerms = [
      // Retail/Store terms
      'supply', 'store', 'shop', 'retail', 'equipment', 'gear', 'apparel', 'clothing', 
      'pro shop', 'sports store', 'outlet', 'warehouse', 'depot', 'mart',
      
      // Business/Company terms  
      'llc', 'inc', 'corp', 'company', 'corporation', 'enterprises', 'ltd',
      
      // Online/Digital terms
      '.com', '.net', '.org', 'website', 'online', 'digital', 'web',
      
      // Manufacturing/Distribution
      'manufacturer', 'distributor', 'wholesale', 'manufacturing', 'factory',
      
      // Education (unless it's for courts)
      'academy', 'school', 'university', 'college', 'institute',
      
      // Services
      'repair', 'service', 'maintenance', 'consulting', 'stringing',
      
      // Real Estate
      'real estate', 'property', 'development', 'construction'
    ];

    for (const term of blacklistTerms) {
      if (combinedText.includes(term)) {
//         console.log(`❌ Filtered out: contains blacklisted term "${term}"`);
        return false;
      }
    }
//     console.log(`✅ Passed blacklist filter`);

    // Exclude retail/store place types
    const types = placeDetails.types || [];
    const excludedTypes = [
      'clothing_store', 'sporting_goods_store', 'store', 'shoe_store',
      'electronics_store', 'shopping_mall', 'department_store',
      'insurance_agency', 'finance', 'real_estate_agency'
    ];

    for (const excludedType of excludedTypes) {
      if (types.includes(excludedType)) {
//         console.log(`❌ Filtered out: has excluded place type "${excludedType}"`);
        return false;
      }
    }
//     console.log(`✅ Passed place type filter`);

    // Check if name or types suggest it's relevant (name already defined above)
    
    // More comprehensive sport keywords
    const allSportKeywords = [
      'tennis', 'pickleball', 'basketball', 'volleyball', 'badminton', 'padel',
      'court', 'courts', 'club', 'center', 'centre', 'complex', 'facility', 'park', 
      'recreation', 'rec', 'sports', 'athletic', 'country club', 'racquet', 'racket'
    ];

//     console.log(`🔎 Checking for sport-related keywords in name: "${name}"`);

    const hasRelevantName = allSportKeywords.some(keyword => {
      const matches = name.includes(keyword);
      // if (matches) console.log(`✅ Name matches keyword: "${keyword}"`);
      return matches;
    });
    
    const hasRelevantType = types.some(type => {
      const relevantTypes = [
        'establishment', 'point_of_interest', 'park', 'gym', 'sports_complex', 
        'stadium', 'school', 'university', 'recreation', 'tourist_attraction'
      ];
      const matches = relevantTypes.includes(type);
      // if (matches) console.log(`✅ Type matches: ${type}`);
      return matches;
    });

    // Special handling for parks (they often have courts)
    const isPark = types.includes('park') || name.includes('park');
    if (isPark) {
//       console.log(`🏞️ This is a park - likely to have courts`);
    }

    const isValid = hasRelevantName || hasRelevantType || isPark;
//     console.log(`🎯 Final validation: ${isValid ? 'VALID' : 'INVALID'} (name: ${hasRelevantName}, type: ${hasRelevantType}, park: ${isPark})`);

    return isValid;
  }

  // Transform Google Places data to our court schema
  transformToCourtData(placeDetails, sportType) {
    return {
      name: placeDetails.name,
      sport_types: [sportType], // Convert to array format
      address: placeDetails.formatted_address,
      latitude: placeDetails.geometry?.location?.lat,
      longitude: placeDetails.geometry?.location?.lng,
      google_place_id: placeDetails.place_id,
      google_rating: placeDetails.rating,
      google_total_ratings: placeDetails.user_ratings_total,
      phone_number: placeDetails.formatted_phone_number,
      website_url: placeDetails.website,
      opening_hours: placeDetails.opening_hours ? {
        open_now: placeDetails.opening_hours.open_now,
        periods: placeDetails.opening_hours.periods,
        weekday_text: placeDetails.opening_hours.weekday_text
      } : null,
      price_level: placeDetails.price_level,
      photos: placeDetails.photos ? placeDetails.photos.map(photo => ({
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      })) : null,
      verification_status: 'pending',
      discovery_source: 'google_places',
      // Set unknown fields with placeholders
      surface_type: '?',
      lighting: null, // Will be shown as '?' in frontend
      court_count: null // Will be shown as '?' in frontend
    };
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get photo URL for a photo reference
  getPhotoUrl(photoReference, maxWidth = 400) {
    if (!this.apiKey || !photoReference) {
      return null;
    }
    
    return `${this.baseUrl}/photo?photo_reference=${photoReference}&maxwidth=${maxWidth}&key=${this.apiKey}`;
  }

  // Geocode an address to get coordinates
  async geocodeAddress(address) {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

//     console.log(`🗺️ Geocoding address: "${address}"`);

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: this.apiKey
        }
      });

//       console.log(`📍 Geocoding response status: ${response.data.status}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
//         console.log(`✅ Geocoded "${address}" to: ${location.lat}, ${location.lng}`);
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: result.formatted_address
        };
      } else {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Reverse geocode coordinates to get address
  async reverseGeocode(latitude, longitude) {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

//     console.log(`🗺️ Reverse geocoding: ${latitude}, ${longitude}`);

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey
        }
      });

//       console.log(`📍 Reverse geocoding response status: ${response.data.status}`);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
//         console.log(`✅ Reverse geocoded to: ${result.formatted_address}`);
        
        return {
          formatted_address: result.formatted_address,
          latitude: latitude,
          longitude: longitude
        };
      } else {
        throw new Error(`Reverse geocoding failed: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }
}

module.exports = new GooglePlacesService();