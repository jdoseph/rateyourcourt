import React, { useState } from 'react';
import GoogleSignIn from './GoogleSignIn';
import '../../App.css';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateField = (name, value, currentForm = form) => {
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

      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== currentForm.password) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;

      default:
        break;
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    
    // Clear general error when user starts typing
    if (error) setError(null);
    
    // Validate current field
    const fieldError = validateField(name, value, newForm);
    let newFieldErrors = {
      ...fieldErrors,
      [name]: fieldError[name] || null
    };
    
    // If password changed, also re-validate confirmPassword
    if (name === 'password' && form.confirmPassword) {
      const confirmError = validateField('confirmPassword', form.confirmPassword, newForm);
      newFieldErrors.confirmPassword = confirmError.confirmPassword || null;
    }
    
    setFieldErrors(newFieldErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Validate all fields
    const allErrors = {};
    Object.keys(form).forEach(field => {
      const fieldError = validateField(field, form[field], form);
      if (fieldError[field]) {
        allErrors[field] = fieldError[field];
      }
    });

    // Additional check for password confirmation
    if (form.password !== form.confirmPassword) {
      allErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // For now, use the backend registration API and show success message
      // In a production app, you would implement email verification on the backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess('Registration successful! You can now log in with your credentials.');
        setForm({ username: '', email: '', password: '', confirmPassword: '' });
        setFieldErrors({});
        
        // Call onRegister if provided
        if (onRegister && data.user) {
          setTimeout(() => onRegister(data.user), 1500);
        }
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        <div className="password-input-container">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            className={`form-input ${fieldErrors.password ? 'form-input-error' : ''}`}
            value={form.password}
            onChange={handleChange}
            placeholder="Create a password"
            disabled={isSubmitting}
            required
          />
          <button
            type="button"
            className="password-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
          >
            {showPassword ? "👁️‍🗨️" : "👁️"}
          </button>
        </div>
        {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Confirm Password</label>
        <div className="password-input-container">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            className={`form-input ${fieldErrors.confirmPassword ? 'form-input-error' : ''}`}
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            disabled={isSubmitting}
            required
          />
          <button
            type="button"
            className="password-toggle-button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isSubmitting}
          >
            {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
          </button>
        </div>
        {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
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
