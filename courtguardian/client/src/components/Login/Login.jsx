import React, { useState } from 'react';
import { login, saveToken, getUserProfile } from '../../api';
import { useNavigate } from 'react-router-dom';
import GoogleSignIn from './GoogleSignIn';
import '../../App.css';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const data = await login(form);

    if (data.error) {
      setError(data.error);
    } else {
      saveToken(data.token);
      
      // Fetch complete user profile after successful login
      const profileData = await getUserProfile();
      if (profileData.error) {
        setError('Failed to load user profile');
        return;
      }
      
      onLogin(profileData.user);
      navigate('/');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert-error">{error}</div>}
      
      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          name="email"
          type="email"
          className="form-input"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          name="password"
          type="password"
          className="form-input"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />
      </div>
      
      <button type="submit" className="form-button">
        Login
      </button>
      
      <GoogleSignIn 
        onLogin={onLogin}
        onError={setError}
      />
    </form>
  );
}
