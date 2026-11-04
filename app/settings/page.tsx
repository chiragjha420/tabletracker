'use client';

import React from 'react';
import { useUser } from '@/components/user-context';
import { useTheme } from '@/components/theme-provider';
import { dataStore } from '@/lib/data/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Sun, Moon, Laptop, Shield, User, Factory, Database, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, allUsers, switchUser } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const factories = dataStore.getFactories();
  const hasSupabase = isSupabaseConfigured();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          System Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Appearance, user authentication, and factory configuration
        </p>
      </div>

      {/* Theme Settings (PRD Section 9.4) */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-3">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Theme Preference
        </h2>
        <p className="text-xs text-muted-foreground">
          Device theme respects your operating system mode. Selected preference is stored locally.
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setTheme('device')}
            className={`min-h-[44px] p-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'device'
                ? 'border-foreground bg-foreground text-background font-semibold'
                : 'border-border bg-surface hover:bg-surface-raised text-foreground'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Device</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`min-h-[44px] p-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'light'
                ? 'border-foreground bg-foreground text-background font-semibold'
                : 'border-border bg-surface hover:bg-surface-raised text-foreground'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`min-h-[44px] p-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center space-y-1.5 transition-colors ${
              theme === 'dark'
                ? 'border-foreground bg-foreground text-background font-semibold'
                : 'border-border bg-surface hover:bg-surface-raised text-foreground'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground pt-1">
          Current active rendering: <span className="font-semibold text-foreground capitalize">{resolvedTheme}</span>
        </div>
      </div>

      {/* User Profile & Role Switcher */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Authenticated Account
        </h2>

        <div className="p-3.5 rounded-lg border border-border bg-surface-raised space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm">{currentUser.full_name}</span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-foreground text-background">
              {currentUser.role}
            </span>
          </div>
          <div className="text-muted-foreground">{currentUser.email}</div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="block text-xs font-medium text-foreground">
            Switch Test Profile (Role Testing)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => switchUser(user.id)}
                className={`min-h-[44px] p-2.5 rounded-lg border text-left text-xs transition-colors ${
                  user.id === currentUser.id
                    ? 'border-foreground bg-foreground text-background font-medium'
                    : 'border-border bg-surface hover:bg-surface-raised text-foreground'
                }`}
              >
                <div className="font-medium">{user.full_name}</div>
                <div className={user.id === currentUser.id ? 'text-background/80 text-[11px]' : 'text-muted-foreground text-[11px]'}>
                  {user.role} • {user.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Factory Configuration */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-3">
        <div className="flex items-center space-x-2">
          <Factory className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Configured Production Facilities
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          {factories.map((fac) => (
            <div key={fac.id} className="p-3 rounded-lg border border-border bg-surface-raised">
              <div className="font-semibold text-foreground">{fac.factory_name}</div>
              <div className="text-muted-foreground text-[11px] mt-0.5">{fac.address}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progressive Web App Status */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-3">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Progressive Web App (PWA)
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          JBB TableTracker is installable on mobile devices (Android / iOS) and desktop. Use your browser&apos;s &quot;Install App&quot; or &quot;Add to Home Screen&quot; action for a standalone app experience.
        </p>
      </div>

      {/* Supabase Connection Status */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Backend Architecture
          </h2>
        </div>
        <p className="text-muted-foreground">
          {hasSupabase ? (
            <span className="text-status-green-text font-medium">
              Connected to live Supabase backend with PostgreSQL, Auth, and Storage.
            </span>
          ) : (
            <span>
              Running in resilient zero-setup development mode with atomic locking, dispatch gate validation, and transactional persistence. Database migration scripts are located in <code className="font-mono bg-surface-raised px-1 py-0.5 rounded">supabase/migrations/</code>.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
