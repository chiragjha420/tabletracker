'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, NotificationItem } from '@/types';
import { dataStore } from '@/lib/data/store';

interface UserContextType {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  switchUser: (userId: string) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  refreshState: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => dataStore.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => dataStore.getUsers());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [, setVersion] = useState(0);

  const reload = () => {
    const user = dataStore.getCurrentUser();
    setCurrentUser(user);
    setAllUsers(dataStore.getUsers());
    const notifs = dataStore.getNotifications(user.id);
    setNotifications(notifs);
    setVersion(v => v + 1);
  };

  useEffect(() => {
    reload();
    const unsubscribe = dataStore.subscribe(() => {
      reload();
    });
    return unsubscribe;
  }, []);

  const switchUser = (userId: string) => {
    dataStore.setCurrentUser(userId);
    reload();
  };

  const markNotificationRead = (id: string) => {
    dataStore.markNotificationAsRead(id);
    reload();
  };

  const markAllNotificationsRead = () => {
    dataStore.markAllNotificationsAsRead(currentUser.id);
    reload();
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        allUsers,
        switchUser,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        refreshState: reload,
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
