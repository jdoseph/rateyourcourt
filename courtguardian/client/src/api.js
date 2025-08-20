const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export async function register({ username, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export function saveToken(token) {
  localStorage.setItem('token', token);
  
  // Dispatch a custom login event for components to listen to
  window.dispatchEvent(new Event('login'));
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  
  // Dispatch a custom logout event for components to listen to
  window.dispatchEvent(new Event('logout'));
}

// Get current user profile
export async function getUserProfile() {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Update user avatar colors
export async function updateAvatarColors(colors) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/avatar-colors`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(colors),
  });
  return res.json();
}

// Update user password
export async function updatePassword({ currentPassword, newPassword }) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/password`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

// Update notification settings
export async function updateNotificationSettings(settings) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/notification-settings`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings),
  });
  return res.json();
}

// Update privacy settings
export async function updatePrivacySettings(settings) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/privacy-settings`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings),
  });
  return res.json();
}

// Delete user account
export async function deleteAccount() {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/account`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Get user's reviews
export async function getUserReviews() {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/reviews`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Update a review
export async function updateReview(reviewId, { rating, comment }) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/reviews/${reviewId}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rating, comment }),
  });
  return res.json();
}

// Delete a review
export async function deleteReview(reviewId) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Get user's saved courts
export async function getUserSavedCourts() {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/saved-courts`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Save a court
export async function saveCourtForUser(courtId) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/saved-courts/${courtId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Remove a saved court
export async function removeSavedCourt(courtId) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/saved-courts/${courtId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}

// Check if a court is saved by user
export async function isCourtSavedByUser(courtId) {
  const token = getToken();
  if (!token) return { error: 'No token found' };

  const res = await fetch(`${API_BASE}/users/saved-courts/${courtId}/status`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  return res.json();
}
