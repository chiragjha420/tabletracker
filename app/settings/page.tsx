'use client';

import React from 'react';
import { useUser } from '@/components/user-context';
import { useTheme } from '@/components/theme-provider';
import { dataStore } from '@/lib/data/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Sun, Moon, Laptop, Factory, Database, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, allUsers, switchUser } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const factories = dataStore.getFactories();
  const hasSupabase = isSupabaseConfigured();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        Settings
      </h1>

      {/* Theme Preference */}
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
          Theme follows system preferences when set to Device. Active: <span className="text-foreground capitalize">{resolvedTheme}</span>
        </div>
      </div>

      {/* Profile & Switcher */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <span className="text-sm font-bold text-foreground block">
          Current Account
        </span>

        <div className="p-3.5 rounded-xl bg-surface-raised flex items-center justify-between text-xs border border-border">
          <div>
            <div className="font-semibold text-foreground text-sm">{currentUser.full_name}</div>
            <div className="text-muted-foreground text-[11px]">{currentUser.email}</div>
          </div>
          <span className="px-2.5 py-1 rounded-full font-mono text-[11px] bg-foreground text-background font-semibold">
            {currentUser.role}
          </span>
        </div>

        <div className="space-y-2 pt-2">
          <span className="text-xs font-medium text-foreground block">
            Switch Role Account
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => switchUser(user.id)}
                className={`min-h-[44px] p-3 rounded-xl text-left text-xs transition-colors ${
                  user.id === currentUser.id
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-surface-raised hover:bg-surface-overlay text-foreground border border-border'
                }`}
              >
                <div className="font-semibold">{user.full_name}</div>
                <div className={user.id === currentUser.id ? 'text-background/80 text-[10px]' : 'text-muted-foreground text-[10px]'}>
                  {user.role}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Configured Facilities */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center space-x-2">
          <Factory className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">
            Production Facilities
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {factories.map((fac) => (
            <div key={fac.id} className="p-3 rounded-xl bg-surface-raised border border-border">
              <div className="font-semibold text-foreground">{fac.factory_name}</div>
              <div className="text-muted-foreground text-[11px] mt-0.5">{fac.address}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PWA & Backend Status */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">
            Backend Connection
          </span>
        </div>
        <p className="text-muted-foreground">
          {hasSupabase ? (
            <span className="text-emerald-400 font-medium">
              Connected to live Supabase backend.
            </span>
          ) : (
            <span>
              Running with transactional atomic state engine. SQL migrations prepared in <code className="font-mono bg-surface-raised px-1 py-0.5 rounded border border-border">supabase/migrations/</code> for cloud deployment.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
