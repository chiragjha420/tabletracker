'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ClipboardList, 
  Plus, 
  History, 
  Settings as SettingsIcon, 
  Bell, 
  ChevronDown,
  Check
} from 'lucide-react';
import { useUser } from './user-context';

export function Navigation() {
  const pathname = usePathname();
  const { currentUser, allUsers, switchUser, unreadCount } = useUser();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const canCreate = currentUser.role === 'ADMIN' || currentUser.role === 'SALES';

  const navItems = [
    { label: 'Tables', href: '/dashboard', icon: ClipboardList },
    ...(canCreate ? [{ label: 'Create Order', href: '/create', icon: Plus }] : []),
    { label: 'Activity', href: '/activity', icon: History },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Sleek Apple-style Frosted Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="font-semibold text-base sm:text-lg tracking-tight text-foreground">
                JBB TableTracker
              </span>
            </Link>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-surface-raised text-muted-foreground border border-border">
              {currentUser.role}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors flex items-center"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.2 bg-foreground text-background rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Quick Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-full bg-surface-raised hover:bg-surface-overlay text-foreground transition-colors border border-border"
              >
                <span className="truncate max-w-[100px] sm:max-w-[140px]">{currentUser.full_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-overlay shadow-2xl z-50 p-1.5 text-xs border border-border">
                    <div className="px-3 py-2 border-b border-divider mb-1">
                      <div className="font-semibold text-foreground">{currentUser.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">{currentUser.email}</div>
                    </div>

                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted px-2.5 py-1">
                      Switch Role Profile
                    </div>

                    {allUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          switchUser(user.id);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          user.id === currentUser.id
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-surface-raised text-foreground'
                        }`}
                      >
                        <div>
                          <div>{user.full_name}</div>
                          <div className={user.id === currentUser.id ? 'text-background/80 text-[10px]' : 'text-muted text-[10px]'}>
                            {user.role}
                          </div>
                        </div>
                        {user.id === currentUser.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:block border-t border-divider">
          <div className="max-w-6xl mx-auto px-4 flex space-x-6 h-10 items-center">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs font-medium flex items-center space-x-1.5 transition-colors h-full border-b-2 ${
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className={`grid ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} h-16 max-w-md mx-auto`}>
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
                <span className="text-[11px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
