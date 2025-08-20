const pool = require('../db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function createUser(username, email, password) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_colors, notification_settings, privacy_settings, created_at',
    [username, email, hashedPassword]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function findUserById(id) {
  const result = await pool.query('SELECT id, username, email, role, avatar_colors, notification_settings, privacy_settings, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

async function validatePassword(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;
  return user;
}

async function updateUserAvatarColors(userId, avatarColors) {
  const result = await pool.query(
    'UPDATE users SET avatar_colors = $1 WHERE id = $2 RETURNING id, username, email, role, avatar_colors, notification_settings, privacy_settings, created_at',
    [JSON.stringify(avatarColors), userId]
  );
  return result.rows[0];
}

async function updateUserPassword(userId, currentPassword, newPassword) {
  // First, get the user to verify current password
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user.rows[0]) return null;
  
  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.rows[0].password);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }
  
  // Hash new password and update
  const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const result = await pool.query(
    'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username, email, role, avatar_colors, notification_settings, privacy_settings, created_at',
    [hashedNewPassword, userId]
  );
  return result.rows[0];
}

async function updateUserNotificationSettings(userId, settings) {
  const result = await pool.query(
    'UPDATE users SET notification_settings = $1 WHERE id = $2 RETURNING id, username, email, role, avatar_colors, notification_settings, privacy_settings, created_at',
    [JSON.stringify(settings), userId]
  );
  return result.rows[0];
}

async function updateUserPrivacySettings(userId, settings) {
  const result = await pool.query(
    'UPDATE users SET privacy_settings = $1 WHERE id = $2 RETURNING id, username, email, role, avatar_colors, notification_settings, privacy_settings, created_at',
    [JSON.stringify(settings), userId]
  );
  return result.rows[0];
}

async function createGoogleUser({ email, username, googleId, avatar }) {
  const result = await pool.query(
    'INSERT INTO users (username, email, google_id, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id, username, email, avatar_colors, notification_settings, privacy_settings, created_at',
    [username, email, googleId, avatar]
  );
  return result.rows[0];
}

async function deleteUser(userId) {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  return result.rows[0];
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  validatePassword,
  createGoogleUser,
  updateUserAvatarColors,
  updateUserPassword,
  updateUserNotificationSettings,
  updateUserPrivacySettings,
  deleteUser,
};
