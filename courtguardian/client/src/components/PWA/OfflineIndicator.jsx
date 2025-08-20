import React, { useState, useEffect } from 'react';
import { offlineManager } from '../../utils/pwa';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleNetworkChange = (event, value) => {
      if (event === 'offline') {
        setIsOffline(true);
      } else if (event === 'online') {
        setIsOffline(false);
      }
    };

    offlineManager.addEventListener(handleNetworkChange);

    // Set initial state
    setIsOffline(!offlineManager.getOnlineStatus());

    return () => {
      offlineManager.removeEventListener(handleNetworkChange);
    };
  }, []);

  return (
    <div className={`offline-indicator ${isOffline ? 'show' : ''}`}>
      <span>📱 You're offline - Some features may be limited</span>
    </div>
  );
}