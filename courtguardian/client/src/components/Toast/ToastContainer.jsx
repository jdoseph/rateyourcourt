import React from 'react';
import Toast from './Toast';

export default function ToastContainer({ toasts, onRemoveToast, position = 'bottom-right' }) {
  if (!toasts || toasts.length === 0) return null;

  const containerStyles = {
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    ...(position.includes('top') ? { top: '1rem' } : { bottom: '1rem' }),
    ...(position.includes('right') ? { right: '1rem' } : { left: '1rem' })
  };

  return (
    <div style={containerStyles}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          show={toast.show}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position="static" // Override position since container handles positioning
          onHide={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  );
}