import React from "react";
import Login from "./Login";
import '../../App.css';

export default function LoginModal({ show, onHide, onLogin }) {
  if (!show) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Login</h2>
          <button className="modal-close-btn" onClick={onHide}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <Login onLogin={(user) => { onLogin(user); onHide(); }} />
        </div>
      </div>
    </div>
  );
}
