import React, { useState, useEffect } from 'react';
import { offlineManager } from '../../utils/pwa';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleNetworkChange = (event, value) => {
      if (event === 'offline') {
        setIsOffline(true);
        // Add a small delay before showing the indicator for better UX
        setTimeout(() => setShowIndicator(true), 300);
      } else if (event === 'online') {
        setIsOffline(false);
        setShowIndicator(false);
      }
    };

    offlineManager.addEventListener(handleNetworkChange);

    // Set initial state - but don't show indicator immediately
    const initialOffline = !offlineManager.getOnlineStatus();
    setIsOffline(initialOffline);
    // Only show indicator if we've been offline for a bit
    if (initialOffline) {
      setTimeout(() => setShowIndicator(initialOffline), 1000);
    }

    return () => {
      offlineManager.removeEventListener(handleNetworkChange);
    };
  }, []);

  return;
}