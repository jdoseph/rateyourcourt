import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import '../../App.css';

export default function AppUserProfile({ user, onLogout }) {
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="user-not-logged-in">
                <span>Please log in to view your profile.</span>
            </div>
        );
    }

    return (
        <div className="dropdown">
            <button
                className="btn dropdown-toggle user-dropdown-button"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                id="userDropdown"
            >
                HEY, {user.username.toUpperCase()}
            </button>
            
            <ul 
                className="dropdown-menu dropdown-menu-end user-dropdown-menu" 
                aria-labelledby="userDropdown"
            >
                <li>
                    <div className="dropdown-header user-dropdown-header">
                        <div className="user-dropdown-header-content">
                            <div 
                                className="user-dropdown-avatar-circle"
                                style={{
                                    background: user.avatar_colors 
                                        ? `linear-gradient(135deg, ${user.avatar_colors.start} 0%, ${user.avatar_colors.end} 100%)`
                                        : 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)'
                                }}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="user-dropdown-welcome">
                                    Welcome!
                                </div>
                                <div className="user-dropdown-username">
                                    {user.username}
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
                
                <li>
                    <button 
                        className="user-dropdown-item"
                        onClick={() => navigate('/profile')}
                    >
                        <i className="bi bi-person user-dropdown-item-icon"></i>
                        Profile
                    </button>
                </li>
                
                <li>
                    <button 
                        className="user-dropdown-item"
                        onClick={() => navigate('/profile?section=settings')}
                    >
                        <i className="bi bi-gear user-dropdown-item-icon"></i>
                        Account Settings
                    </button>
                </li>
                
                <li>
                    <button 
                        className="user-dropdown-item"
                        onClick={() => navigate('/profile?section=ratings')}
                    >
                        <i className="bi bi-star user-dropdown-item-icon"></i>
                        Your Ratings
                    </button>
                </li>
                
                <li>
                    <button 
                        className="user-dropdown-item"
                        onClick={() => navigate('/profile?section=saved')}
                    >
                        <i className="bi bi-bookmark user-dropdown-item-icon"></i>
                        Saved Courts
                    </button>
                </li>
                
                <li>
                    <hr className="dropdown-divider user-dropdown-divider" />
                </li>
                
                <li>
                    <button
                        className="user-dropdown-item user-dropdown-logout"
                        onClick={(e) => {
                            e.preventDefault();
                            if (onLogout && typeof onLogout === 'function') {
                                onLogout();
                            }
                        }}
                    >
                        <i className="bi bi-box-arrow-right user-dropdown-item-icon"></i>
                        Logout
                    </button>
                </li>
            </ul>
        </div>
    );
}