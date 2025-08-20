require('dotenv').config();
const { Pool } = require('pg');
const googlePlacesService = require('./services/googlePlacesService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test the saveDiscoveredCourt function specifically
async function saveDiscoveredCourt(courtData, createdBy) {
  const client = await pool.connect();
  try {
    // Check if court already exists by Google Place ID
    if (courtData.google_place_id) {
      const existing = await client.query(
        'SELECT id FROM courts WHERE google_place_id = $1',
        [courtData.google_place_id]
      );
      
      if (existing.rows.length > 0) {
        console.log(`🔄 Found existing court: ${courtData.name}`);
        return { court: existing.rows[0], isNew: false };
      }
    }

    // Check for potential duplicates by name and location
    const duplicateCheck = await client.query(`
      SELECT id FROM courts 
      WHERE LOWER(name) = LOWER($1) 
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND (6371000 * acos(cos(radians($2)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($3)) + sin(radians($2)) * 
          sin(radians(latitude)))) <= 100
    `, [courtData.name, courtData.latitude, courtData.longitude]);

    if (duplicateCheck.rows.length > 0) {
      console.log(`🔄 Found duplicate court: ${courtData.name}`);
      return { court: duplicateCheck.rows[0], isNew: false };
    }

    console.log(`💾 Attempting to save new court: ${courtData.name}`);
    console.log(`📊 Court data:`, {
      name: courtData.name,
      sport_type: courtData.sport_type,
      address: courtData.address,
      latitude: courtData.latitude,
      longitude: courtData.longitude,
      google_place_id: courtData.google_place_id,
      created_by: createdBy
    });

    // Insert new court
    const result = await client.query(`
      INSERT INTO courts (
        name, sport_type, address, surface_type, lighting, court_count,
        lat, lng, latitude, longitude, google_place_id, google_rating, google_total_ratings,
        phone_number, website_url, opening_hours, price_level, photos,
        verification_status, discovery_source, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      courtData.name,
      courtData.sport_type,
      courtData.address,
      courtData.surface_type,
      courtData.lighting,
      courtData.court_count,
      courtData.latitude, // for lat column
      courtData.longitude, // for lng column  
      courtData.latitude, // for latitude column
      courtData.longitude, // for longitude column
      courtData.google_place_id,
      courtData.google_rating,
      courtData.google_total_ratings,
      courtData.phone_number,
      courtData.website_url,
      JSON.stringify(courtData.opening_hours),
      courtData.price_level,
      JSON.stringify(courtData.photos),
      courtData.verification_status,
      courtData.discovery_source,
      createdBy
    ]);

    console.log(`✅ Successfully saved new court: ${courtData.name} with ID: ${result.rows[0].id}`);
    return { court: result.rows[0], isNew: true };
  } catch (error) {
    console.error(`❌ Error saving court ${courtData.name}:`, error);
    console.error(`🔍 Error details:`, error.message);
    console.error(`📋 Error stack:`, error.stack);
    throw error;
  } finally {
    client.release();
  }
}

async function debugDiscovery() {
  console.log('🐛 Debug: Testing court discovery and saving...');
  
  try {
    // Get a few test courts from Google Places
    console.log('🔍 Fetching courts from Google Places...');
    const courts = await googlePlacesService.searchCourts(32, -83, 10000, 'Tennis');
    console.log(`📊 Found ${courts.length} courts from Google Places`);
    
    if (courts.length === 0) {
      console.log('❌ No courts found from Google Places');
      return;
    }
    
    // Test saving the first few courts
    const adminUserId = '9fcb6fc3-b971-4f3d-a80d-68addb7f4421';
    const testCourts = courts.slice(0, 3); // Test first 3 courts
    
    console.log(`🧪 Testing database save for ${testCourts.length} courts...`);
    
    for (const [index, court] of testCourts.entries()) {
      console.log(`\n📝 Testing court ${index + 1}/${testCourts.length}: ${court.name}`);
      try {
        const result = await saveDiscoveredCourt(court, adminUserId);
        if (result.isNew) {
          console.log(`✅ Success: Saved new court ${court.name}`);
        } else {
          console.log(`🔄 Info: Court ${court.name} already exists`);
        }
      } catch (error) {
        console.error(`❌ Failed to save court ${court.name}:`, error.message);
      }
    }
    
    console.log('\n🏁 Debug test completed');
    
  } catch (error) {
    console.error('❌ Debug discovery error:', error);
  } finally {
    await pool.end();
  }
}

debugDiscovery();