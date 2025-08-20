const express = require('express');
const axios = require('axios');

const router = express.Router();

// Direct test of Google Places API with your coordinates
router.get('/test-location/:lat/:lng', async (req, res) => {
  const { lat, lng } = req.params;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' });
  }

  try {
    console.log(`🧪 Testing location: ${lat}, ${lng}`);
    
    // Try a simple nearby search first
    const nearbyUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const nearbyParams = {
      location: `${lat},${lng}`,
      radius: 10000,
      type: 'establishment',
      keyword: 'tennis',
      key: apiKey
    };

    console.log('📍 Making nearby search request...');
    const nearbyResponse = await axios.get(nearbyUrl, { params: nearbyParams });
    
    console.log(`📊 Nearby search status: ${nearbyResponse.data.status}`);
    console.log(`📈 Nearby results: ${nearbyResponse.data.results?.length || 0}`);

    // Try text search as well
    const textUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const textParams = {
      query: 'tennis court',
      location: `${lat},${lng}`,
      radius: 10000,
      key: apiKey
    };

    console.log('🔍 Making text search request...');
    const textResponse = await axios.get(textUrl, { params: textParams });
    
    console.log(`📊 Text search status: ${textResponse.data.status}`);
    console.log(`📈 Text results: ${textResponse.data.results?.length || 0}`);

    // Return both results for comparison
    res.json({
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      nearbySearch: {
        status: nearbyResponse.data.status,
        count: nearbyResponse.data.results?.length || 0,
        results: nearbyResponse.data.results?.slice(0, 3).map(r => ({
          name: r.name,
          place_id: r.place_id,
          types: r.types,
          vicinity: r.vicinity
        })) || []
      },
      textSearch: {
        status: textResponse.data.status,
        count: textResponse.data.results?.length || 0,
        results: textResponse.data.results?.slice(0, 3).map(r => ({
          name: r.name,
          place_id: r.place_id,
          types: r.types,
          formatted_address: r.formatted_address
        })) || []
      }
    });

  } catch (error) {
    console.error('❌ API test error:', error);
    res.status(500).json({ 
      error: 'API test failed', 
      details: error.response?.data || error.message 
    });
  }
});

// Test a known location (Atlanta) for comparison
router.get('/test-atlanta', async (req, res) => {
  const lat = 33.7490;
  const lng = -84.3880;
  
  try {
    const response = await axios.get(`http://localhost:5001/api/debug/test-location/${lat}/${lng}`);
    res.json({
      message: 'Atlanta test (known good location)',
      data: response.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to test Atlanta location' });
  }
});

module.exports = router;