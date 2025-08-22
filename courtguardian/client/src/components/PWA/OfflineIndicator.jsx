import React, { useState, useEffect } from 'react';
import { offlineManager } from '../../utils/pwa';

export default function OfflineIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleNetworkChange = (event) => {
      if (event === 'offline') {
        // Add a small delay before showing the indicator for better UX
        setTimeout(() => setShowIndicator(true), 300);
      } else if (event === 'online') {
        setShowIndicator(false);
      }
    };

    offlineManager.addEventListener(handleNetworkChange);

    // Set initial state - but don't show indicator immediately
    const initialOffline = !offlineManager.getOnlineStatus();
    // Only show indicator if we've been offline for a bit
    if (initialOffline) {
      setTimeout(() => setShowIndicator(true), 1000);
    }

    return () => {
      offlineManager.removeEventListener(handleNetworkChange);
    };
  }, []);

  return (
    <div className={`offline-indicator ${showIndicator ? 'show' : ''}`}>
      <span>📱 You're offline - Some features may be limited</span>
    </div>
  );
}