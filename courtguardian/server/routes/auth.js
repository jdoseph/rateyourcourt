const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createUser, validatePassword, findUserByEmail, createGoogleUser } = require('../models/user');
require('dotenv').config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Basic field validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Username validation
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  if (username.length > 50) {
    return res.status(400).json({ error: 'Username must be 50 characters or less' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (email.length > 100) {
    return res.status(400).json({ error: 'Email must be 100 characters or less' });
  }

  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password must be 128 characters or less' });
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
  }

  try {
    // Check for existing email
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email address is already registered' });
    }

    const user = await createUser(username, email, password);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      // Unique violation - check constraint name for more specific error
      if (err.constraint === 'users_email_key') {
        return res.status(400).json({ error: 'Email address is already registered' });
      } else if (err.constraint === 'users_username_key') {
        return res.status(400).json({ error: 'Username is already taken' });
      } else {
        return res.status(400).json({ error: 'Email or username already in use' });
      }
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Missing email or password' });

  try {
    const user = await validatePassword(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth Login
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'No email provided by Google' });
    }

    // Check if user already exists
    let user = await findUserByEmail(email);

    if (!user) {
      // Create new user with Google data
      user = await createGoogleUser({
        email,
        username: name,
        googleId,
        avatar: picture,
      });
    }

    // Generate JWT token
    const jwtPayload = { id: user.id, username: user.username };
    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: jwtPayload });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

module.exports = router;
