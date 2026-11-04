'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-status-red-bg border-b border-status-red-border text-status-red-text px-4 py-2 text-xs font-medium text-center flex items-center justify-center space-x-2">
      <WifiOff className="w-4 h-4" />
      <span>Offline: Task updates and photo submissions require a network connection.</span>
    </div>
  );
}
