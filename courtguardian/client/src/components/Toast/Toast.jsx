import React, { useEffect, useState, useCallback } from 'react';
import '../../App.css';

export default function Toast({ 
  show, 
  onHide, 
  message, 
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 4000,
  position = 'bottom-right' // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onHide();
    }, 300); // Match animation duration
  }, [onHide]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsExiting(false);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [show, duration, message, type, handleClose]);

  if (!show && !isVisible) return null;

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed',
      zIndex: 9999,
      padding: '1rem 1.25rem',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '0.875rem',
      fontWeight: '500',
      maxWidth: '400px',
      minWidth: '300px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      transition: 'all 0.3s ease',
      transform: isExiting ? 'translateY(-10px)' : 'translateY(0)',
      opacity: isExiting ? 0 : 1
    };

    // Position styles
    const positionStyles = {
      'top-right': { top: '1rem', right: '1rem' },
      'top-left': { top: '1rem', left: '1rem' },
      'bottom-right': { bottom: '1rem', right: '1rem' },
      'bottom-left': { bottom: '1rem', left: '1rem' }
    };

    // Type-based styles
    const typeStyles = {
      success: {
        backgroundColor: '#10b981',
        color: 'white',
        border: '1px solid #059669'
      },
      error: {
        backgroundColor: '#ef4444',
        color: 'white',
        border: '1px solid #dc2626'
      },
      warning: {
        backgroundColor: '#f59e0b',
        color: 'white',
        border: '1px solid #d97706'
      },
      info: {
        backgroundColor: '#3b82f6',
        color: 'white',
        border: '1px solid #2563eb'
      }
    };

    return {
      ...baseStyles,
      ...positionStyles[position],
      ...typeStyles[type]
    };
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <div style={getToastStyles()}>
      <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
        {getIcon()}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '1.25rem',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1,
          opacity: 0.7
        }}
        onMouseEnter={(e) => e.target.style.opacity = 1}
        onMouseLeave={(e) => e.target.style.opacity = 0.7}
      >
        ×
      </button>
    </div>
  );
}