#!/usr/bin/env node

require('dotenv').config();
const { courtDiscoveryQueue } = require('./courtDiscoveryQueue');
const scheduler = require('./scheduler');

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\n🛑 Shutting down job processor...');
  
  // Stop the scheduler
  scheduler.stop();
  
  // Close the queue
  await courtDiscoveryQueue.close();
  
  console.log('✅ Job processor shut down successfully');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the job processor
async function start() {
  try {
    console.log('🚀 Starting Court Guardian Background Job Processor...\n');
    
    // Display configuration
    console.log('📋 Configuration:');
    console.log(`   Redis Host: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`   Redis Port: ${process.env.REDIS_PORT || 6379}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`   Google Places API: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured' : 'Not configured'}\n`);
    
    // Start the job scheduler
    scheduler.start();
    
    // Display queue status
    const waiting = await courtDiscoveryQueue.getWaiting();
    const active = await courtDiscoveryQueue.getActive();
    const completed = await courtDiscoveryQueue.getCompleted();
    const failed = await courtDiscoveryQueue.getFailed();
    
    console.log('📊 Queue Status:');
    console.log(`   Waiting: ${waiting.length}`);
    console.log(`   Active: ${active.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   Failed: ${failed.length}\n`);
    
    console.log('✅ Job processor is running. Press Ctrl+C to stop.\n');
    
    // Log queue events
    courtDiscoveryQueue.on('waiting', (jobId) => {
      console.log(`⏳ Job ${jobId} is waiting`);
    });
    
    courtDiscoveryQueue.on('active', (job, jobPromise) => {
      console.log(`🔄 Job ${job.id} started processing`);
    });
    
    courtDiscoveryQueue.on('progress', (job, progress) => {
      console.log(`📈 Job ${job.id} progress: ${progress}%`);
    });
    
    courtDiscoveryQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });
    
    courtDiscoveryQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed: ${err.message}`);
    });
    
    // Keep the process running
    setInterval(() => {
      // Heartbeat to keep process alive
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to start job processor:', error);
    process.exit(1);
  }
}

// Add some test jobs if this script is run directly
if (require.main === module) {
  start();
  
  // Add a test job after 5 seconds
  setTimeout(async () => {
    console.log('🧪 Adding test discovery job...');
    const { addDiscoveryJob } = require('./courtDiscoveryQueue');
    
    try {
      // Test job for Atlanta, GA area
      await addDiscoveryJob(33.7490, -84.3880, 10000, 'Tennis', 'normal');
      console.log('📋 Test job added successfully');
    } catch (error) {
      console.error('❌ Failed to add test job:', error);
    }
  }, 5000);
}

module.exports = { start, shutdown };