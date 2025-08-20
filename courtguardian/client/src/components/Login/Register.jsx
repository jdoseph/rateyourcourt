import React, { useState } from 'react';
import { register, saveToken } from '../../api';
import GoogleSignIn from './GoogleSignIn';
import '../../App.css';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name, value) => {
    const errors = {};

    switch (name) {
      case 'username':
        if (!value) {
          errors.username = 'Username is required';
        } else if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters long';
        } else if (value.length > 50) {
          errors.username = 'Username must be 50 characters or less';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
        }
        break;

      case 'email':
        if (!value) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else if (value.length > 100) {
          errors.email = 'Email must be 100 characters or less';
        }
        break;

      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 8) {
          errors.password = 'Password must be at least 8 characters long';
        } else if (value.length > 128) {
          errors.password = 'Password must be 128 characters or less';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        break;

      default:
        break;
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear general error when user starts typing
    if (error) setError(null);
    
    // Validate field and update field errors
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: fieldError[name] || null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Validate all fields
    const allErrors = {};
    Object.keys(form).forEach(field => {
      const fieldError = validateField(field, form[field]);
      if (fieldError[field]) {
        allErrors[field] = fieldError[field];
      }
    });

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      setIsSubmitting(false);
      return;
    }

    const data = await register(form);
    setIsSubmitting(false);

    if (data.error) {
      setError(data.error);
    } else {
      setSuccess('Registration successful!');
      setForm({ username: '', email: '', password: '' });
      setFieldErrors({});
      // Call onRegister if provided
      if (onRegister && data.user) {
        setTimeout(() => onRegister(data.user), 1500);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="form-group">
        <label className="form-label">Username</label>
        <input
          name="username"
          type="text"
          className={`form-input ${fieldErrors.username ? 'form-input-error' : ''}`}
          value={form.username}
          onChange={handleChange}
          placeholder="Choose a username"
          disabled={isSubmitting}
          required
        />
        {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          name="email"
          type="email"
          className={`form-input ${fieldErrors.email ? 'form-input-error' : ''}`}
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          disabled={isSubmitting}
          required
        />
        {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          name="password"
          type="password"
          className={`form-input ${fieldErrors.password ? 'form-input-error' : ''}`}
          value={form.password}
          onChange={handleChange}
          placeholder="Create a password"
          disabled={isSubmitting}
          required
        />
        {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
      </div>
      
      <button type="submit" className="form-button" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </button>
      
      <GoogleSignIn 
        onLogin={onRegister}
        onError={setError}
      />
    </form>
  );
}
