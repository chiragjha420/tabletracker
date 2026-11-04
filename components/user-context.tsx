'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, NotificationItem } from '@/types';
import { dataStore } from '@/lib/data/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';

interface UserContextType {
  currentUser: UserProfile;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  refreshState: () => void;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => dataStore.getCurrentUser());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const supabase = createClient();

  const loadUserProfile = async () => {
    setIsLoading(true);

    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile from public.profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            setCurrentUser(profile as UserProfile);
            dataStore.setSessionUser(profile as UserProfile);
          } else {
            // Check if there are any active ADMIN profiles in database
            const { data: adminProfiles } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'ADMIN')
              .limit(1);

            const isInitialAdmin = !adminProfiles || adminProfiles.length === 0;

            const tempProfile: UserProfile = {
              id: user.id,
              email: user.email || '',
              full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
              role: isInitialAdmin ? 'ADMIN' : ((user.user_metadata?.role as any) || 'SUPERVISOR'),
              is_active: isInitialAdmin,
              created_at: user.created_at,
              updated_at: user.created_at,
            };
            setCurrentUser(tempProfile);
            dataStore.setSessionUser(tempProfile);
          }
        } else {
          // Not authenticated in Supabase
          const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/qr/');
          if (!isPublicRoute) {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase auth session:', err);
      }
    } else {
      // Local development or admin mode
      const user = dataStore.getCurrentUser();
      setCurrentUser(user);
    }

    const notifs = dataStore.getNotifications(currentUser.id);
    setNotifications(notifs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUserProfile();

    if (supabase && isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
          if (!pathname.startsWith('/qr/')) {
            router.push('/login');
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      const unsubscribe = dataStore.subscribe(() => {
        const user = dataStore.getCurrentUser();
        setCurrentUser(user);
        setNotifications(dataStore.getNotifications(user.id));
      });
      return unsubscribe;
    }
  }, [pathname]);

  const signOut = async () => {
    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    router.push('/login');
  };

  const markNotificationRead = (id: string) => {
    dataStore.markNotificationAsRead(id);
    setNotifications(dataStore.getNotifications(currentUser.id));
  };

  const markAllNotificationsRead = () => {
    dataStore.markAllNotificationsAsRead(currentUser.id);
    setNotifications(dataStore.getNotifications(currentUser.id));
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Pending approval screen if a real user is registered but not yet approved by Admin
  const isPendingApproval = isSupabaseConfigured() && currentUser && !currentUser.is_active && currentUser.role !== 'ADMIN';
  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/qr/');

  if (isPendingApproval && !isPublicRoute) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-surface border border-border text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Account Pending Approval
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account <span className="text-foreground font-semibold">({currentUser.email})</span> has been registered and is awaiting administrator approval and role authorization.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="px-5 py-2 rounded-xl bg-surface-raised hover:bg-surface-overlay text-xs font-semibold text-foreground border border-border transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{
        currentUser,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        refreshState: loadUserProfile,
        signOut,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
