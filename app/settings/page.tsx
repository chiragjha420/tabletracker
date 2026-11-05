'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/user-context';
import { useTheme } from '@/components/theme-provider';
import { 
  playChime, 
  triggerVibration, 
  requestNotificationPermission, 
  dispatchNotification 
} from '@/lib/notifications/sound-vibration';
import { Sun, Moon, Laptop, Users, LogOut, Bell, Volume2, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentUser, signOut } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const isAdmin = currentUser.role === 'ADMIN';

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    if (res === 'granted') {
      setTestFeedback('Push notifications with sound and vibration enabled!');
      setTimeout(() => setTestFeedback(null), 3000);
    }
  };

  const handleTestSoundAndVibration = () => {
    playChime(false);
    triggerVibration(false);
    dispatchNotification('JBB TableTracker Notification Test', 'Sound chime and phone vibration are working perfectly!');
    setTestFeedback('Chime played & vibration triggered!');
    setTimeout(() => setTestFeedback(null), 3000);
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 w-32 rounded-xl bg-surface-raised" />
        <div className="h-44 rounded-2xl bg-surface border border-border" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Settings
      </h1>

      {/* Account Info & Sign Out */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <span className="text-sm font-bold text-foreground block">
          Account Profile
        </span>

        <div className="p-4 rounded-xl bg-surface-raised flex items-center justify-between text-xs border border-border">
          <div>
            <div className="font-semibold text-foreground text-sm">{currentUser.full_name}</div>
            <div className="text-muted-foreground text-[11px]">{currentUser.email}</div>
          </div>
          <span className="px-2.5 py-1 rounded-full font-mono text-[11px] bg-foreground text-background font-semibold">
            {currentUser.role}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {isAdmin && (
            <Link
              href="/users"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-xs font-semibold text-foreground border border-border transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>User & Factory Management</span>
            </Link>
          )}

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors border border-rose-500/20 ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <span className="text-sm font-bold text-foreground block">
          Appearance
        </span>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setTheme('device')}
            className={`min-h-[44px] p-3 rounded-xl text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'device'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Device</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`min-h-[44px] p-3 rounded-xl text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'light'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`min-h-[44px] p-3 rounded-xl text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'dark'
                ? 'bg-foreground text-background font-semibold'
                : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground pt-1">
          Active theme: <span className="text-foreground capitalize">{resolvedTheme}</span>
        </div>
      </div>

      {/* Push Notifications, Sound & Vibration */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3.5">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">
            Push Notifications & Vibration
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Receive real-time push notifications with sound chimes and phone vibration whenever tables are submitted, tasks start, issues arise, or tables are dispatched.
        </p>

        <div className="p-3 rounded-xl bg-surface-raised border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Notification Permission:</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] capitalize ${
              notificationPermission === 'granted' 
                ? 'bg-emerald-500/15 text-emerald-400' 
                : notificationPermission === 'denied'
                ? 'bg-rose-500/15 text-rose-400'
                : 'bg-surface-overlay text-foreground'
            }`}>
              {notificationPermission}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-muted-foreground pt-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>High-definition audio chime enabled</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-muted-foreground">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile vibration haptics supported</span>
          </div>
        </div>

        {testFeedback && (
          <div className="text-xs text-emerald-400 font-medium py-1 animate-in fade-in">
            ✓ {testFeedback}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center space-x-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Browser Push Notifications</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTestSoundAndVibration}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-foreground text-xs font-medium border border-border transition-colors flex items-center justify-center space-x-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Test Sound & Vibration Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
