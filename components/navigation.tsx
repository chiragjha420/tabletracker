'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ClipboardList, 
  PlusCircle, 
  History, 
  Settings as SettingsIcon, 
  CheckSquare, 
  Bell, 
  Factory as FactoryIcon, 
  ChevronDown
} from 'lucide-react';
import { useUser } from './user-context';
import { useTheme } from './theme-provider';

export function Navigation() {
  const pathname = usePathname();
  const { currentUser, allUsers, switchUser, unreadCount } = useUser();
  const { theme, setTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isAdminOrSales = currentUser.role === 'ADMIN' || currentUser.role === 'SALES';

  const navItems = isAdminOrSales
    ? [
        { label: 'Tables', href: '/dashboard', icon: ClipboardList },
        { label: 'Create Table', href: '/create', icon: PlusCircle },
        { label: 'Activity', href: '/activity', icon: History },
        { label: 'Settings', href: '/settings', icon: SettingsIcon },
      ]
    : [
        { label: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
        { label: 'All Tables', href: '/dashboard', icon: ClipboardList },
        { label: 'Activity', href: '/activity', icon: History },
        { label: 'Settings', href: '/settings', icon: SettingsIcon },
      ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href={isAdminOrSales ? "/dashboard" : "/my-tasks"} className="flex items-center space-x-2">
              <span className="font-semibold text-lg tracking-tight text-foreground">
                JBB TableTracker
              </span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded font-medium border border-border text-muted-foreground bg-surface-raised">
              {currentUser.role}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notifications Link */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-foreground hover:bg-surface-raised transition-colors flex items-center"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="ml-1 text-xs font-semibold px-1.5 py-0.2 bg-foreground text-background rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Quick Role & User Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 text-sm font-medium px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors"
              >
                <span className="truncate max-w-[110px] sm:max-w-[150px]">{currentUser.full_name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-lg z-50 p-2 text-sm">
                    <div className="px-2 py-1.5 border-b border-divider mb-1">
                      <div className="font-medium text-foreground">{currentUser.full_name}</div>
                      <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                    </div>

                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                      Switch Active Account
                    </div>

                    {allUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          switchUser(user.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user.id === currentUser.id
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-surface-raised text-foreground'
                        }`}
                      >
                        <div>
                          <div>{user.full_name}</div>
                          <div className={user.id === currentUser.id ? 'text-background/75' : 'text-muted-foreground'}>
                            {user.role}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Sub Navigation */}
        <div className="hidden md:block border-t border-divider">
          <div className="max-w-6xl mx-auto px-4 flex space-x-6 h-11 items-center">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium flex items-center space-x-1.5 transition-colors h-full border-b-2 ${
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Primary phone experience) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                  active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
