'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/user-context';
import { useTheme } from '@/components/theme-provider';
import { dataStore } from '@/lib/data/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Sun, Moon, Laptop, Factory, Database, Users, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentUser, signOut } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const factories = dataStore.getFactories();
  const hasSupabase = isSupabaseConfigured();
  const isAdmin = currentUser.role === 'ADMIN';

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
              <span>User Approvals & Roles</span>
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

      {/* Facilities */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center space-x-2">
          <Factory className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">
            Manufacturing Facilities
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

      {/* Supabase Connection */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">
            Supabase Connection
          </span>
        </div>
        <p className="text-muted-foreground">
          {hasSupabase ? (
            <span className="text-emerald-400 font-medium">
              Connected to your Supabase project. Authentication, Storage, and PostgreSQL are active.
            </span>
          ) : (
            <span>
              Connect your Supabase project in <code className="font-mono bg-surface-raised px-1 py-0.5 rounded border border-border">.env.local</code>. Database migration scripts are ready in <code className="font-mono bg-surface-raised px-1 py-0.5 rounded border border-border">supabase/migrations/</code>.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
