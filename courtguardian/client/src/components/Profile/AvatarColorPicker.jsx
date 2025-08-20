import React, { useState, useEffect } from 'react';
import '../../App.css';

export default function AvatarColorPicker({ user, onColorChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColors, setTempColors] = useState({
    start: user?.avatar_colors?.start || '#3498db',
    end: user?.avatar_colors?.end || '#2c3e50'
  });
  const [showCustomSection, setShowCustomSection] = useState(false);

  // Update tempColors when user's avatar colors change
  useEffect(() => {
    setTempColors({
      start: user?.avatar_colors?.start || '#3498db',
      end: user?.avatar_colors?.end || '#2c3e50'
    });
  }, [user?.avatar_colors]);

  // Predefined color combinations
  const presetCombinations = [
    { start: '#3498db', end: '#2c3e50', name: 'Blue' },
    { start: '#e74c3c', end: '#c0392b', name: 'Red' },
    { start: '#2ecc71', end: '#27ae60', name: 'Green' },
    { start: '#f39c12', end: '#e67e22', name: 'Sunset' },
    { start: '#9b59b6', end: '#8e44ad', name: 'Purple' },
    { start: '#1abc9c', end: '#16a085', name: 'Turquoise' },
    { start: '#34495e', end: '#2c3e50', name: 'Slate' },
    { start: '#e91e63', end: '#ad1457', name: 'Pink' },
  ];

  // Check if user has custom colors (not matching any preset)
  const hasCustomColors = () => {
    if (!user?.avatar_colors) return false;
    
    const userColors = user.avatar_colors;
    return !presetCombinations.some(preset => 
      preset.start === userColors.start && preset.end === userColors.end
    );
  };

  // Custom preset that uses user's current colors or defaults
  const customPreset = {
    start: user?.avatar_colors?.start || '#3498db',
    end: user?.avatar_colors?.end || '#2c3e50',
    name: 'Custom',
    isCustom: true
  };

  const handlePresetSelect = (preset) => {
    setTempColors(preset);
    setShowCustomSection(preset.isCustom || false);
  };

  const handleCustomColorChange = (type, color) => {
    setTempColors(prev => ({
      ...prev,
      [type]: color
    }));
  };

  const handleSave = async () => {
    setIsOpen(false);
    setShowCustomSection(false);
    // Small delay to ensure modal closes before showing success message
    setTimeout(() => {
      onColorChange(tempColors);
    }, 100);
  };

  const handleCancel = () => {
    setTempColors({
      start: user?.avatar_colors?.start || '#3498db',
      end: user?.avatar_colors?.end || '#2c3e50'
    });
    setIsOpen(false);
    setShowCustomSection(false);
  };

  const currentColors = {
    start: user?.avatar_colors?.start || '#3498db',
    end: user?.avatar_colors?.end || '#2c3e50'
  };

  return (
    <div className="avatar-color-picker">
      {/* Current Avatar Preview */}
      <div className="avatar-preview-section">
        <label className="form-label">Avatar Colors</label>
        <div className="avatar-preview-container">
          <div 
            className="avatar-preview"
            style={{
              background: `linear-gradient(135deg, ${currentColors.start} 0%, ${currentColors.end} 100%)`
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setShowCustomSection(hasCustomColors());
            }}
            disabled={disabled}
            className="avatar-customize-btn"
          >
            <i className="bi-palette"></i>
            Customize
          </button>
        </div>
      </div>

      {/* Color Picker Modal */}
      {isOpen && (
        <div className="color-picker-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
          <div className="color-picker-modal">
            <div className="color-picker-header">
              <h3>Customize Avatar Colors</h3>
              <button onClick={handleCancel} className="modal-close-btn">×</button>
            </div>
            
            <div className="color-picker-body">
              {/* Live Preview */}
              <div className="color-preview-section">
                <div 
                  className="color-preview-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${tempColors.start} 0%, ${tempColors.end} 100%)`
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Preset Color Combinations */}
              <div className="preset-colors-section">
                <h4>Quick Presets</h4>
                <div className="preset-colors-grid">
                  {presetCombinations.map((preset, index) => (
                    <button
                      key={index}
                      className={`preset-color-btn ${
                        tempColors.start === preset.start && tempColors.end === preset.end ? 'active' : ''
                      }`}
                      onClick={() => handlePresetSelect(preset)}
                    >
                      <div 
                        className="preset-color-preview"
                        style={{
                          background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`
                        }}
                      ></div>
                      <span className="preset-color-name">{preset.name}</span>
                    </button>
                  ))}
                  
                  {/* Custom Preset */}
                  <button
                    className={`preset-color-btn ${
                      hasCustomColors() && (tempColors.start === customPreset.start && tempColors.end === customPreset.end) ? 'active' : ''
                    }`}
                    onClick={() => handlePresetSelect(customPreset)}
                  >
                    <div 
                      className="preset-color-preview custom-preset-preview"
                      style={{
                        background: `linear-gradient(135deg, ${customPreset.start} 0%, ${customPreset.end} 100%)`
                      }}
                    >
                      <i className="bi-brush"></i>
                    </div>
                    <span className="preset-color-name">{customPreset.name}</span>
                  </button>
                </div>
              </div>

              {/* Custom Color Inputs - Only show when custom preset is selected */}
              {showCustomSection && (
                <div className="custom-colors-section">
                  <h4>Custom Colors</h4>
                  <div className="custom-colors-inputs">
                    <div className="color-input-group">
                      <label className="color-input-label">Primary Color</label>
                      <div className="color-input-container">
                        <input
                          type="color"
                          value={tempColors.start}
                          onChange={(e) => handleCustomColorChange('start', e.target.value)}
                          className="color-input"
                        />
                        <input
                          type="text"
                          value={tempColors.start}
                          onChange={(e) => handleCustomColorChange('start', e.target.value)}
                          className="color-text-input"
                          placeholder="#3498db"
                        />
                      </div>
                    </div>
                    
                    <div className="color-input-group">
                      <label className="color-input-label">Secondary Color</label>
                      <div className="color-input-container">
                        <input
                          type="color"
                          value={tempColors.end}
                          onChange={(e) => handleCustomColorChange('end', e.target.value)}
                          className="color-input"
                        />
                        <input
                          type="text"
                          value={tempColors.end}
                          onChange={(e) => handleCustomColorChange('end', e.target.value)}
                          className="color-text-input"
                          placeholder="#2c3e50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="color-picker-footer">
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleSave} className="save-btn">
                Save Colors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}