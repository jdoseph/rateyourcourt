import React from "react";
import Register from "./Register";
import '../../App.css';

export default function RegisterModal({ show, onHide, onRegister }) {
  if (!show) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container-large">
        <div className="modal-header">
          <h2 className="modal-title">Create Account</h2>
          <button className="modal-close-btn" onClick={onHide}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <Register onRegister={(user) => { onRegister(user); onHide(); }} />
        </div>
      </div>
    </div>
  );
}
