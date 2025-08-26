import React, { useState, useEffect } from 'react';
import { getToken } from '../../api';
import { API_BASE_URL } from '../../constants';

const AVAILABLE_SPORTS = ['Tennis', 'Pickleball', 'Basketball', 'Volleyball', 'Badminton', 'Padel'];

export default function CourtVerification({ courtId, court, onVerificationSubmitted, onShowToast }) {
  const [verificationData, setVerificationData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [selectedField, setSelectedField] = useState('');
  const [formData, setFormData] = useState({
    newValue: '',
    verificationType: 'addition',
    notes: ''
  });

  // Fetch verification data for this court
  useEffect(() => {
    async function fetchVerificationData() {
      try {
        const response = await fetch(`${API_BASE_URL}/verifications/court/${courtId}`);
        if (response.ok) {
          const data = await response.json();
          setVerificationData(data);
        } else {
          console.error('Failed to fetch verification data');
        }
      } catch (error) {
        console.error('Error fetching verification data:', error);
      }
    }

    fetchVerificationData();
  }, [courtId]);

  // Handle field verification submission
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    
    const token = getToken();
    if (!token) {
      if (onShowToast) {
        onShowToast({ show: true, message: 'Please log in to submit verifications', type: 'error' });
      }
      return;
    }

    if (!selectedField || (!formData.newValue.trim() && selectedField !== 'sport_types')) {
      if (onShowToast) {
        onShowToast({ show: true, message: 'Please select a field and provide a value', type: 'error' });
      }
      return;
    }

    // Special validation for sport_types
    if (selectedField === 'sport_types') {
      if (!formData.newValue || formData.newValue.trim() === '') {
        if (onShowToast) {
          onShowToast({ show: true, message: 'Please select a sport type', type: 'error' });
        }
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verifications/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courtId: courtId,
          fieldName: selectedField,
          oldValue: getFieldValue(selectedField),
          newValue: formData.newValue,
          verificationType: formData.verificationType,
          notes: formData.notes
        })
      });

      const result = await response.json();

      if (response.ok) {
        
        // Reset form immediately since we're using parent toast
        setFormData({ newValue: '', verificationType: 'addition', notes: '' });
        setSelectedField('');
        setShowVerificationForm(false);
        
        // Refresh verification data
        const refreshResponse = await fetch(`${API_BASE_URL}/verifications/court/${courtId}`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setVerificationData(refreshData);
        }
        
        // Notify parent component
        if (onVerificationSubmitted) {
          onVerificationSubmitted();
        }

        if (onShowToast) {
          onShowToast({ show: true, message: 'Verification submitted successfully!', type: 'success' });
        }
      } else {
        if (onShowToast) {
          onShowToast({ show: true, message: result.error || 'Failed to submit verification', type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error submitting verification :', error);
      if (onShowToast) {
        onShowToast({ show: true, message: 'Failed to submit verification. Please try again.', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get current value for a field
  const getFieldValue = (fieldName) => {
    switch (fieldName) {
      case 'surface_type': return court?.surface_type;
      case 'court_count': return court?.court_count;
      case 'lighting': return court?.lighting;
      case 'phone_number': return court?.phone_number;
      case 'website_url': return court?.website_url;
      case 'opening_hours': return court?.opening_hours;
      case 'address': return court?.address;
      case 'name': return court?.name;
      case 'sport_types': {
        const sportTypes = court?.sport_types;
        
        if (!sportTypes) return null;
        
        // Handle all possible formats recursively
        const parseSportTypes = (value) => {
          // If it's already a clean string, return it
          if (typeof value === 'string' && !value.startsWith('{') && !value.startsWith('[')) {
            return value;
          }
          
          // If it's an array, get the first element
          if (Array.isArray(value) && value.length > 0) {
            return parseSportTypes(value[0]);
          }
          
          // If it's a JSON string, parse it
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return parseSportTypes(parsed);
            } catch (e) {
              // Remove curly braces manually if JSON parsing failed
              return value.replace(/^[{\["]*|[}\]"]*$/g, '');
            }
          }
          
          return String(value);
        };
        
        return parseSportTypes(sportTypes);
      }
      default: return null;
    }
  };

  // Check if a field is missing or needs verification
  const isFieldMissing = (fieldName) => {
    const value = getFieldValue(fieldName);
    return value === null || value === undefined || value === '' || value === '?';
  };

  // Format field display name
  const getFieldDisplayName = (fieldName) => {
    const names = {
      'surface_type': 'Surface Type',
      'court_count': 'Number of Courts',
      'lighting': 'Lighting',
      'phone_number': 'Phone Number',
      'website_url': 'Website',
      'opening_hours': 'Opening Hours',
      'address': 'Address',
      'name': 'Court Name',
      'sport_types': 'Sport Type'
    };
    return names[fieldName] || fieldName;
  };

  // Get verification type options based on field state
  const getVerificationTypeOptions = (fieldName) => {
    const isMissing = isFieldMissing(fieldName);
    if (isMissing) {
      return [
        { value: 'addition', label: 'Add missing information' }
      ];
    } else {
      return [
        { value: 'confirmation', label: 'Confirm current information is correct' },
        { value: 'correction', label: 'Correct existing information' }
      ];
    }
  };

  if (!verificationData) {
    return null;
  }

  const { missingFields, needsVerification } = verificationData;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '2rem',
      border: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Court Information Verification
          </h3>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            Help improve court data accuracy by verifying or adding missing information
          </p>
        </div>
        
        {needsVerification && (
          <div style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            border: '1px solid #f59e0b'
          }}>
            ⚠️ Needs Verification
          </div>
        )}
      </div>

      {/* Missing Fields Alert */}
      {missingFields.length > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: '600' }}>
              Missing Information
            </h4>
          </div>
          <p style={{ margin: '0 0 1rem 0', color: '#b45309', fontSize: '0.875rem' }}>
            The following fields are missing data and need community verification:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {missingFields.map(field => (
              <span
                key={field}
                style={{
                  backgroundColor: '#fdba74',
                  color: '#9a3412',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                {getFieldDisplayName(field)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verification Form */}
      {!showVerificationForm ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <button
            onClick={() => setShowVerificationForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            ✏️ Help Verify Court Information
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerificationSubmit} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Field Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Field to Verify *
              </label>
              <select
                value={selectedField}
                onChange={(e) => {
                  setSelectedField(e.target.value);
                  setFormData({ ...formData, newValue: '', verificationType: 'addition' });
                }}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">Select a field...</option>
                <optgroup label="Missing Information">
                  {missingFields.map(field => (
                    <option key={field} value={field}>
                      {getFieldDisplayName(field)} (Missing)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Verify Existing Information">
                  {['surface_type', 'court_count', 'lighting', 'phone_number', 'website_url', 'opening_hours', 'address', 'name', 'sport_types']
                    .filter(field => !missingFields.includes(field))
                    .map(field => (
                      <option key={field} value={field}>
                        {getFieldDisplayName(field)} (Current: {(() => {
                          const value = getFieldValue(field);
                          
                          // Handle sport_types specifically - it might be stored as JSON string like {"tennis"} or ["tennis"]
                          if (field === 'sport_types' && typeof value === 'string') {
                            try {
                              const parsed = JSON.parse(value);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                return parsed[0];
                              } else if (typeof parsed === 'string') {
                                return parsed;
                              }
                            } catch (e) {
                              // If JSON parsing fails, might be a plain string already
                              return value;
                            }
                          }
                          
                          if (Array.isArray(value) && value.length > 0) {
                            return value[0];
                          } else if (Array.isArray(value)) {
                            return 'Empty array';
                          } else if (value === null || value === undefined) {
                            return 'None';
                          } else {
                            return String(value);
                          }
                        })()})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Verification Type */}
            {selectedField && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Verification Type *
                </label>
                <select
                  value={formData.verificationType}
                  onChange={(e) => setFormData({ ...formData, verificationType: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  {getVerificationTypeOptions(selectedField).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Value Input */}
            {selectedField && formData.verificationType !== 'confirmation' && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {isFieldMissing(selectedField) ? 'Add Value' : 'Correct Value'} *
                </label>
                {selectedField === 'lighting' ? (
                  <select
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Select lighting availability...</option>
                    <option value="true">Available</option>
                    <option value="false">Not Available</option>
                  </select>
                ) : selectedField === 'surface_type' ? (
                  <select
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Select surface type...</option>
                    <option value="Hard Court">Hard Court</option>
                    <option value="Clay">Clay</option>
                    <option value="Grass">Grass</option>
                    <option value="Artificial Turf">Artificial Turf</option>
                    <option value="Asphalt">Asphalt</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Wood">Wood</option>
                    <option value="Other">Other</option>
                  </select>
                ) : selectedField === 'court_count' ? (
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    placeholder="Number of courts"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                ) : selectedField === 'sport_types' ? (
                  <select
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Select sport type...</option>
                    {AVAILABLE_SPORTS.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                ) : selectedField === 'opening_hours' ? (
                  <textarea
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    placeholder="e.g., Mon-Fri: 6am-10pm, Sat-Sun: 7am-9pm"
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                ) : (
                  <input
                    type={selectedField === 'website_url' ? 'url' : selectedField === 'phone_number' ? 'tel' : 'text'}
                    value={formData.newValue}
                    onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                    placeholder={
                      selectedField === 'phone_number' ? 'e.g., (555) 123-4567' :
                      selectedField === 'website_url' ? 'e.g., https://example.com' :
                      `Enter ${getFieldDisplayName(selectedField).toLowerCase()}`
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Additional Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional context or source information..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setShowVerificationForm(false);
                setSelectedField('');
                setFormData({ newValue: '', verificationType: 'addition', notes: '' });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e5e7eb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting || !selectedField}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: submitting || !selectedField ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: submitting || !selectedField ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!submitting && selectedField) {
                  e.target.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && selectedField) {
                  e.target.style.backgroundColor = '#10b981';
                }
              }}
            >
              {submitting ? (
                <>
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Submitting...
                </>
              ) : (
                <>
                  ✅ Submit Verification
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}