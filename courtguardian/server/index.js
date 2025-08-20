require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

const pool = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

const authenticateToken = require('./middleware/auth');

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Protected content',
    user: req.user,
  });
});

const courtsRoutes = require('./routes/courts');
const reviewsRoutes = require('./routes/reviews');
const discoveryRoutes = require('./routes/discovery');
const verificationsRoutes = require('./routes/verifications');
// const testApiRoutes = require('./routes/test-api'); // Disabled for production
const debugDiscoveryRoutes = require('./routes/debug-discovery');
const adminJobsRoutes = require('./routes/admin/jobs');
const photosRoutes = require('./routes/photos');

app.use('/api/courts', courtsRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/verifications', verificationsRoutes);
// Reviews route with different pattern to avoid conflicts:
app.use('/api/reviews', reviewsRoutes);
// app.use('/api/test', testApiRoutes); // Disabled for production
app.use('/api/debug', debugDiscoveryRoutes);
app.use('/api/admin/jobs', adminJobsRoutes);
app.use('/api', photosRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
