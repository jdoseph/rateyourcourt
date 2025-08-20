const express = require('express');
const authenticateToken = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/adminAuth');
const { courtDiscoveryQueue, addDiscoveryJob } = require('../../jobs/courtDiscoveryQueue');
const scheduler = require('../../jobs/scheduler');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get job queue status and statistics
router.get('/status', async (req, res) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      courtDiscoveryQueue.getWaiting(),
      courtDiscoveryQueue.getActive(),
      courtDiscoveryQueue.getCompleted(),
      courtDiscoveryQueue.getFailed(),
      courtDiscoveryQueue.getDelayed()
    ]);

    const schedulerStatus = scheduler.getStatus();

    res.json({
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      },
      scheduler: schedulerStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get recent jobs with details
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20, status = 'all' } = req.query;

    let jobs = [];
    
    if (status === 'all' || status === 'completed') {
      const completed = await courtDiscoveryQueue.getCompleted(0, parseInt(limit));
      jobs.push(...completed.map(job => ({ ...job, status: 'completed' })));
    }
    
    if (status === 'all' || status === 'failed') {
      const failed = await courtDiscoveryQueue.getFailed(0, parseInt(limit));
      jobs.push(...failed.map(job => ({ ...job, status: 'failed' })));
    }
    
    if (status === 'all' || status === 'active') {
      const active = await courtDiscoveryQueue.getActive(0, parseInt(limit));
      jobs.push(...active.map(job => ({ ...job, status: 'active' })));
    }
    
    if (status === 'all' || status === 'waiting') {
      const waiting = await courtDiscoveryQueue.getWaiting(0, parseInt(limit));
      jobs.push(...waiting.map(job => ({ ...job, status: 'waiting' })));
    }

    // Sort by timestamp (most recent first)
    jobs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit results
    jobs = jobs.slice(0, parseInt(limit));

    // Format job data for frontend
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      status: job.status,
      data: job.data,
      progress: job.progress || 0,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade
    }));

    res.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('Error getting recent jobs:', error);
    res.status(500).json({ error: 'Failed to get recent jobs' });
  }
});

// Get popular search areas statistics
router.get('/popular-areas', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          latitude,
          longitude,
          total_found,
          last_discovered,
          sport_type,
          ROUND(CAST(6371000 * acos(cos(radians(40.7128)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(-74.0060)) + sin(radians(40.7128)) * 
                sin(radians(latitude))) AS numeric), 0) as distance_from_nyc
        FROM discovery_areas 
        WHERE total_found > 0
        ORDER BY total_found DESC, last_discovered DESC
        LIMIT 50
      `);
      
      res.json({ areas: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting popular areas:', error);
    res.status(500).json({ error: 'Failed to get popular areas' });
  }
});

// Manually trigger discovery job
router.post('/trigger-discovery', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000, sportType = 'Tennis', priority = 'high' } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const job = await addDiscoveryJob(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius),
      sportType,
      priority
    );

    res.json({
      message: 'Discovery job triggered successfully',
      jobId: job.id,
      jobData: job.data
    });
  } catch (error) {
    console.error('Error triggering discovery job:', error);
    res.status(500).json({ error: 'Failed to trigger discovery job' });
  }
});

// Control scheduler
router.post('/scheduler/:action', async (req, res) => {
  try {
    const { action } = req.params;

    if (action === 'start') {
      scheduler.start();
      res.json({ message: 'Scheduler started successfully' });
    } else if (action === 'stop') {
      scheduler.stop();
      res.json({ message: 'Scheduler stopped successfully' });
    } else {
      res.status(400).json({ error: 'Invalid action. Use start or stop.' });
    }
  } catch (error) {
    console.error('Error controlling scheduler:', error);
    res.status(500).json({ error: 'Failed to control scheduler' });
  }
});

// Clean up old jobs
router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Clean completed jobs older than specified days
    await courtDiscoveryQueue.clean(parseInt(days) * 24 * 60 * 60 * 1000, 'completed');
    
    // Clean failed jobs older than specified days  
    await courtDiscoveryQueue.clean(parseInt(days) * 24 * 60 * 60 * 1000, 'failed');

    res.json({ 
      message: `Cleaned up jobs older than ${days} days`
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({ error: 'Failed to clean up jobs' });
  }
});

// Get job details by ID
router.get('/job/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await courtDiscoveryQueue.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      data: job.data,
      progress: job.progress,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      opts: job.opts
    });
  } catch (error) {
    console.error('Error getting job details:', error);
    res.status(500).json({ error: 'Failed to get job details' });
  }
});

// Retry failed job
router.post('/job/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await courtDiscoveryQueue.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await job.retry();

    res.json({ message: 'Job queued for retry' });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

module.exports = router;