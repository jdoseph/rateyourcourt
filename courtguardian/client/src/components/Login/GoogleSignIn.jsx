import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { saveToken, getUserProfile } from '../../api';

export default function GoogleSignIn({ onLogin, onError }) {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the Google credential to our backend
      const response = await fetch('${API_BASE_URL}/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (data.error) {
        onError?.(data.error);
        return;
      }

      // Save the JWT token
      saveToken(data.token);

      // Get the full user profile
      const profileData = await getUserProfile();
      if (profileData.error) {
        onError?.('Failed to load user profile');
        return;
      }

      // Call the onLogin callback with user data
      onLogin?.(profileData.user);
    } catch (error) {
      console.error('Google sign-in error:', error);
      onError?.('Failed to sign in with Google');
    }
  };

  const handleGoogleError = () => {
    console.error('Google sign-in failed');
    onError?.('Google sign-in was cancelled or failed');
  };

  return (
    <div className="google-signin-container">
      <div className="google-signin-divider">
        <span className="google-signin-divider-text">or</span>
      </div>
      
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme="outline"
        size="large"
        width="100%"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  );
}