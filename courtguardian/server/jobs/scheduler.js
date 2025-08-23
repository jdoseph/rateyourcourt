const cron = require('node-cron');
const { Pool } = require('pg');
const { addDiscoveryJob } = require('./courtDiscoveryQueue');
const { ALLOWED_SPORTS } = require('../constants');

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class JobScheduler {
  constructor() {
    this.isRunning = false;
    this.scheduledJobs = new Map();
  }

  start() {
    if (this.isRunning) {
      console.log('📅 Job scheduler is already running');
      return;
    }

    console.log('🚀 Starting background job scheduler...');
    this.isRunning = true;

    // Schedule discovery for popular areas every 6 hours
    const popularAreasJob = cron.schedule('0 */6 * * *', async () => {
      console.log('🔍 Running scheduled discovery for popular areas...');
      await this.discoverPopularAreas();
    }, {
      scheduled: false
    });

    // Schedule discovery for major cities daily at 2 AM
    const majorCitiesJob = cron.schedule('0 2 * * *', async () => {
      console.log('🏙️ Running scheduled discovery for major cities...');
      await this.discoverMajorCities();
    }, {
      scheduled: false
    });

    // Schedule cleanup of old discovery data weekly
    const cleanupJob = cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 Running weekly cleanup of old discovery data...');
      await this.cleanupOldData();
    }, {
      scheduled: false
    });

    // Start all scheduled jobs
    popularAreasJob.start();
    majorCitiesJob.start();
    cleanupJob.start();

    this.scheduledJobs.set('popularAreas', popularAreasJob);
    this.scheduledJobs.set('majorCities', majorCitiesJob);
    this.scheduledJobs.set('cleanup', cleanupJob);

    console.log('✅ Job scheduler started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('📅 Job scheduler is not running');
      return;
    }

    console.log('🛑 Stopping job scheduler...');
    
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped ${name} job`);
    });

    this.scheduledJobs.clear();
    this.isRunning = false;
    
    console.log('✅ Job scheduler stopped');
  }

  async discoverPopularAreas() {
    try {
      const popularAreas = await this.getPopularSearchAreas();
      console.log(`📊 Found ${popularAreas.length} popular search areas`);

      for (const area of popularAreas) {
        for (const sport of ALLOWED_SPORTS) {
          try {
            await addDiscoveryJob(
              area.latitude, 
              area.longitude, 
              area.avg_radius || 10000,
              sport,
              'normal'
            );
          } catch (error) {
            console.error(`❌ Failed to add discovery job for ${sport} at ${area.latitude}, ${area.longitude}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in discoverPopularAreas:', error);
    }
  }

  async discoverMajorCities() {
    // Predefined major cities and metropolitan areas
    const majorCities = [
      // US Major Cities
      { name: 'New York, NY', latitude: 40.7128, longitude: -74.0060, radius: 15000 },
      { name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437, radius: 15000 },
      { name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298, radius: 15000 },
      { name: 'Houston, TX', latitude: 29.7604, longitude: -95.3698, radius: 15000 },
      { name: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0740, radius: 15000 },
      { name: 'Philadelphia, PA', latitude: 39.9526, longitude: -75.1652, radius: 15000 },
      { name: 'San Antonio, TX', latitude: 29.4241, longitude: -98.4936, radius: 15000 },
      { name: 'San Diego, CA', latitude: 32.7157, longitude: -117.1611, radius: 15000 },
      { name: 'Dallas, TX', latitude: 32.7767, longitude: -96.7970, radius: 15000 },
      { name: 'Austin, TX', latitude: 30.2672, longitude: -97.7431, radius: 15000 },
      { name: 'San Jose, CA', latitude: 37.3382, longitude: -121.8863, radius: 15000 },
      { name: 'Jacksonville, FL', latitude: 30.3322, longitude: -81.6557, radius: 15000 },
      { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, radius: 15000 },
      { name: 'Indianapolis, IN', latitude: 39.7684, longitude: -86.1581, radius: 15000 },
      { name: 'Columbus, OH', latitude: 39.9612, longitude: -82.9988, radius: 15000 },
      { name: 'Fort Worth, TX', latitude: 32.7555, longitude: -97.3308, radius: 15000 },
      { name: 'Charlotte, NC', latitude: 35.2271, longitude: -80.8431, radius: 15000 },
      { name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321, radius: 15000 },
      { name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903, radius: 15000 },
      { name: 'Washington, DC', latitude: 38.9072, longitude: -77.0369, radius: 15000 },
      
      // International Cities (sample)
      { name: 'Toronto, ON', latitude: 43.6532, longitude: -79.3832, radius: 15000 },
      { name: 'London, UK', latitude: 51.5074, longitude: -0.1278, radius: 15000 },
      { name: 'Paris, France', latitude: 48.8566, longitude: 2.3522, radius: 15000 },
      { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503, radius: 15000 },
      { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093, radius: 15000 }
    ];

    console.log(`🏙️ Processing ${majorCities.length} major cities`);

    for (const city of majorCities) {
      // Discover all sports in major cities
      for (const sport of ALLOWED_SPORTS) {
        try {
          await addDiscoveryJob(
            city.latitude, 
            city.longitude, 
            city.radius,
            sport,
            'low' // Lower priority for major cities
          );
          console.log(`📋 Added discovery job for ${sport} in ${city.name}`);
        } catch (error) {
          console.error(`❌ Failed to add discovery job for ${sport} in ${city.name}:`, error);
        }
      }
    }
  }

  async getPopularSearchAreas() {
    const client = await pool.connect();
    try {
      // Get areas that have been searched multiple times in the last 30 days
      const result = await client.query(`
        SELECT 
          latitude,
          longitude,
          COUNT(*) as search_count,
          AVG(radius) as avg_radius,
          MAX(last_discovered) as last_searched
        FROM discovery_areas 
        WHERE last_discovered > NOW() - INTERVAL '30 days'
        GROUP BY latitude, longitude
        HAVING COUNT(*) >= 1
        ORDER BY search_count DESC, last_searched DESC
        LIMIT 20
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async cleanupOldData() {
    const client = await pool.connect();
    try {
      // Remove discovery area records older than 90 days
      const result = await client.query(`
        DELETE FROM discovery_areas 
        WHERE last_discovered < NOW() - INTERVAL '90 days'
      `);
      
      console.log(`🧹 Cleaned up ${result.rowCount} old discovery area records`);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      nextRuns: Array.from(this.scheduledJobs.entries()).map(([name, job]) => ({
        name,
        nextRun: job.nextDates ? job.nextDates().toString() : 'Unknown'
      }))
    };
  }
}

module.exports = new JobScheduler();