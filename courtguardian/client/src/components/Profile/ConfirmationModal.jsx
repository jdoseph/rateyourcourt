import React from 'react';
import '../../App.css';

export default function ConfirmationModal({ 
  show, 
  onHide, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger', 'warning', 'info'
}) {
  if (!show) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return { background: '#dc2626', color: 'white' };
      case 'warning':
        return { background: '#f59e0b', color: 'white' };
      case 'info':
        return { background: '#3b82f6', color: 'white' };
      default:
        return { background: '#dc2626', color: 'white' };
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={onHide}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem', color: '#374151' }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="form-button"
              style={{ 
                background: '#f3f4f6', 
                color: '#374151',
                border: '1px solid #d1d5db'
              }}
              onClick={onHide}
            >
              {cancelText}
            </button>
            <button
              className="form-button"
              style={getConfirmButtonStyle()}
              onClick={() => {
                onConfirm();
                onHide();
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}