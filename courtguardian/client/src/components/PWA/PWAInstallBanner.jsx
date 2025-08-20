import React, { useState, useEffect } from 'react';
import { pwaInstallManager, isStandalone } from '../../utils/pwa';

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Don't show banner if already installed
    if (isStandalone()) {
      return;
    }

    // Check if user has dismissed banner recently
    const dismissedTime = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) { // Don't show for 7 days after dismissal
        return;
      }
    }

    // Listen for installable event
    const handleInstallable = (event, value) => {
      if (event === 'installable') {
        setShowBanner(value);
      } else if (event === 'installed') {
        setShowBanner(false);
        localStorage.removeItem('pwa-banner-dismissed');
      }
    };

    pwaInstallManager.addEventListener(handleInstallable);

    // Check initial state
    if (pwaInstallManager.getInstallable()) {
      setShowBanner(true);
    }

    return () => {
      pwaInstallManager.removeEventListener(handleInstallable);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const result = await pwaInstallManager.showInstallPrompt();
      console.log('Install result:', result);
      
      if (result.outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div>
        <strong>Install RateYourCourt</strong>
        <br />
        Get quick access and work offline!
      </div>
      <div>
        <button 
          onClick={handleDismiss}
          style={{ 
            background: 'rgba(255,255,255,0.1)',
            marginRight: '8px'
          }}
        >
          Maybe Later
        </button>
        <button 
          onClick={handleInstall}
          disabled={isInstalling}
          style={{ 
            background: 'rgba(255,255,255,0.9)',
            color: '#4285f4'
          }}
        >
          {isInstalling ? 'Installing...' : 'Install'}
        </button>
      </div>
    </div>
  );
}