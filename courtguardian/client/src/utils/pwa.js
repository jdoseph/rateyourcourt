// PWA Utility Functions

// Check if app is running in standalone mode (installed PWA)
export const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone ||
    document.referrer.includes('android-app://')
  );
};

// Check if device supports PWA installation
export const isPWAInstallable = () => {
  return (
    'serviceWorker' in navigator &&
    'BeforeInstallPromptEvent' in window
  );
};

// PWA Install Manager
class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.listeners = [];
    
    this.init();
  }
  
  init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.notifyListeners('installable', true);
    });
    
    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.isInstallable = false;
      this.notifyListeners('installed', true);
    });
  }
  
  // Show install prompt
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return { outcome: 'dismissed', reason: 'No prompt available' };
    }
    
    // Show the prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    
    // Clear the deferred prompt
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.notifyListeners('installable', false);
    
    return { outcome };
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.push(callback);
  }
  
  // Remove event listener
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners
  notifyListeners(event, value) {
    this.listeners.forEach(callback => callback(event, value));
  }
  
  // Check if installable
  getInstallable() {
    return this.isInstallable;
  }
}

// Create singleton instance
export const pwaInstallManager = new PWAInstallManager();

// Offline/Online status manager
class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    
    this.init();
  }
  
  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online', true);
      console.log('App is back online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline', true);
      console.log('App is offline');
    });
  }
  
  // Add event listener
  addEventListener(callback) {
    this.listeners.push(callback);
  }
  
  // Remove event listener
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners
  notifyListeners(event, value) {
    this.listeners.forEach(callback => callback(event, value));
  }
  
  // Get current status
  getOnlineStatus() {
    return this.isOnline;
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager();

// Push notification manager
class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.permission = Notification.permission;
  }
  
  // Initialize push notifications
  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }
    
    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }
  
  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }
    
    if (this.permission === 'granted') {
      return 'granted';
    }
    
    if (this.permission !== 'denied') {
      this.permission = await Notification.requestPermission();
    }
    
    return this.permission;
  }
  
  // Subscribe to push notifications
  async subscribe() {
    if (!this.registration) {
      await this.init();
    }
    
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }
    
    try {
      // Note: You'll need to generate VAPID keys for production
      // For now, we'll just set up the structure
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      console.log('Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }
  
  // Show local notification
  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }
    
    const defaultOptions = {
      icon: '/icon-logo.svg',
      badge: '/favicon.ico',
      tag: 'courtguardian-notification',
      requireInteraction: false
    };
    
    if (this.registration) {
      return this.registration.showNotification(title, { ...defaultOptions, ...options });
    } else {
      return new Notification(title, { ...defaultOptions, ...options });
    }
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Touch interaction optimizations
export const optimizeTouchInteractions = () => {
  // Add touch-friendly styles
  const style = document.createElement('style');
  style.textContent = `
    /* PWA Touch Optimizations */
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    input, textarea, [contenteditable] {
      -webkit-user-select: text !important;
      -khtml-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
    
    button, [role="button"], .btn, a {
      touch-action: manipulation;
      -webkit-tap-highlight-color: rgba(66, 133, 244, 0.2);
    }
    
    .pwa-install-banner {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .pwa-install-banner button {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 12px;
    }
    
    .pwa-install-banner button:hover {
      background: rgba(255,255,255,0.3);
    }
    
    .offline-indicator {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      padding: 8px;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      z-index: 1001;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    }
    
    .offline-indicator.show {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
};

// Initialize PWA features
export const initializePWA = () => {
  // Optimize touch interactions
  optimizeTouchInteractions();
  
  // Initialize managers
  pwaInstallManager.init();
  offlineManager.init();
  pushNotificationManager.init();
  
  console.log('PWA features initialized');
};