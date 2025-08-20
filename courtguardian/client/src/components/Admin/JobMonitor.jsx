import React, { useState, useEffect } from 'react';
import { getToken } from '../../api';

export default function JobMonitor() {
  const [jobStatus, setJobStatus] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualJob, setManualJob] = useState({
    latitude: '',
    longitude: '',
    radius: 10000,
    sportType: 'Tennis'
  });

  const fetchJobStatus = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5001/api/admin/jobs/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch job status');
      const data = await response.json();
      setJobStatus(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5001/api/admin/jobs/recent', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch recent jobs');
      const data = await response.json();
      setRecentJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerDiscoveryJob = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5001/api/admin/jobs/trigger-discovery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manualJob)
      });
      
      if (!response.ok) throw new Error('Failed to trigger discovery job');
      const data = await response.json();
      
      alert(`Discovery job triggered successfully! Job ID: ${data.jobId}`);
      
      // Reset form and refresh data
      setManualJob({
        latitude: '',
        longitude: '',
        radius: 10000,
        sportType: 'Tennis'
      });
      
      fetchJobStatus();
      fetchRecentJobs();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const controlScheduler = async (action) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5001/api/admin/jobs/scheduler/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error(`Failed to ${action} scheduler`);
      const data = await response.json();
      
      alert(data.message);
      fetchJobStatus();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJobStatus(), fetchRecentJobs()]);
      setLoading(false);
    };

    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchJobStatus();
      fetchRecentJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'active': return '#f59e0b';
      case 'waiting': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="job-monitor-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading job monitor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-monitor-error">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="job-monitor-container">
      <h3 className="job-monitor-title">Background Job Monitor</h3>

      {/* Job Queue Status */}
      <div className="job-monitor-card">
        <h4 className="job-monitor-card-title">Queue Status</h4>
        <div className="queue-status-grid">
          <div className="queue-stat-item">
            <div className="queue-stat-number queue-stat-waiting">
              {jobStatus?.queue.waiting || 0}
            </div>
            <div className="queue-stat-label">Waiting</div>
          </div>
          <div className="queue-stat-item">
            <div className="queue-stat-number queue-stat-active">
              {jobStatus?.queue.active || 0}
            </div>
            <div className="queue-stat-label">Active</div>
          </div>
          <div className="queue-stat-item">
            <div className="queue-stat-number queue-stat-completed">
              {jobStatus?.queue.completed || 0}
            </div>
            <div className="queue-stat-label">Completed</div>
          </div>
          <div className="queue-stat-item">
            <div className="queue-stat-number queue-stat-failed">
              {jobStatus?.queue.failed || 0}
            </div>
            <div className="queue-stat-label">Failed</div>
          </div>
        </div>
      </div>

      {/* Scheduler Control */}
      <div className="job-monitor-card">
        <h4 className="job-monitor-card-title">Scheduler Control</h4>
        <div className="scheduler-controls">
          <span className={`scheduler-status-badge ${
            jobStatus?.scheduler.running ? 'scheduler-status-running' : 'scheduler-status-stopped'
          }`}>
            {jobStatus?.scheduler.running ? 'Running' : 'Stopped'}
          </span>
          <button
            onClick={() => controlScheduler(jobStatus?.scheduler.running ? 'stop' : 'start')}
            className={`scheduler-control-button ${
              jobStatus?.scheduler.running ? 'scheduler-button-stop' : 'scheduler-button-start'
            }`}
          >
            {jobStatus?.scheduler.running ? 'Stop Scheduler' : 'Start Scheduler'}
          </button>
        </div>
      </div>

      {/* Manual Job Trigger */}
      <div className="job-monitor-card">
        <h4 className="job-monitor-card-title">Manual Discovery Job</h4>
        <div className="manual-job-form">
          <div className="form-field">
            <label className="form-label-job">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={manualJob.latitude}
              onChange={(e) => setManualJob({...manualJob, latitude: e.target.value})}
              className="form-input-job"
              placeholder="33.7490"
            />
          </div>
          <div className="form-field">
            <label className="form-label-job">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={manualJob.longitude}
              onChange={(e) => setManualJob({...manualJob, longitude: e.target.value})}
              className="form-input-job"
              placeholder="-84.3880"
            />
          </div>
          <div className="form-field">
            <label className="form-label-job">
              Radius (m)
            </label>
            <input
              type="number"
              value={manualJob.radius}
              onChange={(e) => setManualJob({...manualJob, radius: parseInt(e.target.value) || 10000})}
              className="form-input-job"
            />
          </div>
          <div className="form-field">
            <label className="form-label-job">
              Sport Type
            </label>
            <select
              value={manualJob.sportType}
              onChange={(e) => setManualJob({...manualJob, sportType: e.target.value})}
              className="form-input-job"
            >
              <option value="Tennis">Tennis</option>
              <option value="Pickleball">Pickleball</option>
              <option value="Basketball">Basketball</option>
            </select>
          </div>
        </div>
        <button
          onClick={triggerDiscoveryJob}
          disabled={!manualJob.latitude || !manualJob.longitude}
          className={`trigger-job-button ${
            (!manualJob.latitude || !manualJob.longitude) ? 'trigger-job-button-disabled' : 'trigger-job-button-enabled'
          }`}
        >
          Trigger Discovery Job
        </button>
      </div>

      {/* Recent Jobs */}
      <div className="job-monitor-card">
        <h4 className="job-monitor-card-title">Recent Jobs</h4>
        {recentJobs.length === 0 ? (
          <p className="recent-jobs-empty">No recent jobs</p>
        ) : (
          <div className="recent-jobs-list">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="job-item"
              >
                <div className="job-item-header">
                  <div className="job-item-title-section">
                    <span className="job-item-id">Job #{job.id}</span>
                    <span 
                      className="job-status-badge"
                      style={{
                        backgroundColor: getStatusColor(job.status) + '20',
                        color: getStatusColor(job.status)
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <span className="job-item-timestamp">
                    {formatDate(job.timestamp)}
                  </span>
                </div>
                <div className="job-item-details">
                  {job.data.sportType} courts at {job.data.latitude}, {job.data.longitude} 
                  (radius: {job.data.radius}m)
                </div>
                {job.returnvalue && (
                  <div className="job-item-results">
                    Processed: {job.returnvalue.courts_processed} courts 
                    ({job.returnvalue.new_courts} new, {job.returnvalue.duplicates} duplicates)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}