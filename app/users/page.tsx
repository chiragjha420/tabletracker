'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { 
  Shield, 
  Check, 
  X, 
  Factory as FactoryIcon, 
  AlertCircle, 
  UserPlus, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  User as UserIcon,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { currentUser } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedUserForFactory, setSelectedUserForFactory] = useState<UserProfile | null>(null);
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<'SUPERVISOR' | 'SALES'>('SUPERVISOR');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal State
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<UserProfile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const factories = dataStore.getFactories();

  const loadUsers = () => {
    let list = dataStore.getUsers();
    if (roleFilter !== 'All') {
      list = list.filter(u => u.role === roleFilter);
    }
    if (statusFilter === 'Active') {
      list = list.filter(u => u.is_active);
    } else if (statusFilter === 'Pending') {
      list = list.filter(u => !u.is_active);
    }
    setUsers(list);

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data: profiles, error }) => {
          if (!error && profiles && profiles.length > 0) {
            profiles.forEach((p: any) => {
              dataStore.setSessionUser(p as UserProfile);
            });
            let updated = dataStore.getUsers();
            if (roleFilter !== 'All') updated = updated.filter(u => u.role === roleFilter);
            if (statusFilter === 'Active') updated = updated.filter(u => u.is_active);
            else if (statusFilter === 'Pending') updated = updated.filter(u => !u.is_active);
            setUsers(updated);
          }
        });
    }
  };

  useEffect(() => {
    loadUsers();
    const unsub = dataStore.subscribe(() => {
      loadUsers();
    });
    return unsub;
  }, [roleFilter, statusFilter]);

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-surface-raised" />
        <div className="h-40 rounded-2xl bg-surface border border-border" />
      </div>
    );
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="py-20 text-center space-y-3">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground">
          Only administrators can access user management and approval controls.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold"
        >
          Return to Tables
        </Link>
      </div>
    );
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setFeedbackMessage(null);
    const res = dataStore.updateUserRole(userId, newRole, currentUser.id);
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
      return;
    }
    setFeedbackMessage({ type: 'success', text: `Role updated to ${newRole}.` });
    loadUsers();

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('Supabase role update error:', error);
        });
    }
  };

  const handleApprovalToggle = (userId: string, currentActive: boolean) => {
    setFeedbackMessage(null);
    const res = dataStore.toggleUserApproval(userId, !currentActive, currentUser.id);
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
      return;
    }
    setFeedbackMessage({ type: 'success', text: !currentActive ? 'Account approved.' : 'Account suspended.' });
    loadUsers();

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      supabase
        .from('profiles')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('Supabase approval update error:', error);
        });
    }
  };

  const openFactoryModal = (user: UserProfile) => {
    setSelectedUserForFactory(user);
    const userFacs = dataStore.getUserFactoryAccess(user.id);
    setSelectedFactories(userFacs);
  };

  const handleSaveFactoryAccess = () => {
    if (!selectedUserForFactory) return;
    const targetUserId = selectedUserForFactory.id;
    const facIds = [...selectedFactories];

    const res = dataStore.setUserFactoryAccess(targetUserId, facIds, currentUser.id);
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
      return;
    }
    setFeedbackMessage({ type: 'success', text: res.message });
    setSelectedUserForFactory(null);
    loadUsers();

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      supabase.from('factory_access').delete().eq('user_id', targetUserId).then(() => {
        if (facIds.length > 0) {
          const rows = facIds.map(fId => ({ user_id: targetUserId, factory_id: fId }));
          supabase.from('factory_access').insert(rows).then();
        }
      });
    }
  };

  const toggleFactorySelection = (factoryId: string) => {
    if (selectedFactories.includes(factoryId)) {
      setSelectedFactories(selectedFactories.filter(id => id !== factoryId));
    } else {
      setSelectedFactories([...selectedFactories, factoryId]);
    }
  };

  // Submit Handler for Admin Creating a User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const supabase = createClient();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase && isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      if (currentUser?.role === 'ADMIN') {
        headers['x-admin-role'] = 'ADMIN';
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: newFullName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.error || 'Failed to create user account.');
        setIsCreating(false);
        return;
      }

      // Add to local dataStore immediately
      dataStore.createUser({
        id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        is_active: true,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Account created successfully for ${data.user.email}. User can log in immediately.`,
      });

      // Reset form and close modal
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('SUPERVISOR');
      setShowCreateModal(false);
      setIsCreating(false);
      loadUsers();
    } catch (err: any) {
      setCreateError(err?.message || 'Network error creating user.');
      setIsCreating(false);
    }
  };

  // Submit Handler for Admin Resetting a Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordReset) return;
    setResetError(null);
    setIsResettingPassword(true);

    try {
      const supabase = createClient();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase && isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      if (currentUser?.role === 'ADMIN') {
        headers['x-admin-role'] = 'ADMIN';
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          userId: selectedUserForPasswordReset.id,
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || 'Failed to reset password.');
        setIsResettingPassword(false);
        return;
      }

      setFeedbackMessage({
        type: 'success',
        text: `Password successfully updated for ${selectedUserForPasswordReset.email}.`,
      });
      setSelectedUserForPasswordReset(null);
      setResetPassword('');
      setIsResettingPassword(false);
    } catch (err: any) {
      setResetError(err?.message || 'Network error updating password.');
      setIsResettingPassword(false);
    }
  };

  const roles: UserRole[] = ['ADMIN', 'SALES', 'SUPERVISOR'];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            User Accounts & Role Permissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage factory supervisors and sales credentials, roles, and facility access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center space-x-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center space-x-2 border ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-1 rounded-xl bg-surface p-1 border border-border text-xs">
          <span className="px-2 text-muted-foreground font-medium">Role:</span>
          {['All', 'ADMIN', 'SALES', 'SUPERVISOR'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1 rounded-xl bg-surface p-1 border border-border text-xs">
          <span className="px-2 text-muted-foreground font-medium">Status:</span>
          {['All', 'Active', 'Pending'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* User Table / Cards */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden divide-y divide-divider">
        {users.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground text-sm">No users found</p>
            <p>Click &quot;Create User&quot; above to create login credentials for your team.</p>
          </div>
        ) : (
          users.map((user) => {
            const userFactories = dataStore.getUserFactoryAccess(user.id);
            const isSelf = user.id === currentUser.id;

            return (
              <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-foreground">
                      {user.full_name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                      user.is_active 
                        ? 'bg-emerald-500/15 text-emerald-400' 
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {user.is_active ? 'Active' : 'Pending Approval'}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-surface-raised text-muted font-medium border border-border">
                        You
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground font-mono">
                    {user.email}
                  </div>

                  {user.role === 'SUPERVISOR' && (
                    <div className="flex items-center space-x-1.5 text-xs text-muted pt-0.5">
                      <FactoryIcon className="w-3.5 h-3.5" />
                      <span>
                        {userFactories.length === 0
                          ? 'No factory access assigned'
                          : userFactories.map(fId => factories.find(f => f.id === fId)?.factory_name).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Role Selector */}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                    disabled={isSelf}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-raised text-foreground text-xs font-medium border border-border focus:outline-none focus:border-neutral-500 disabled:opacity-50"
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>

                  {/* Factory Access Button (For Supervisors) */}
                  {user.role === 'SUPERVISOR' && (
                    <button
                      type="button"
                      onClick={() => openFactoryModal(user)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-foreground text-xs font-medium border border-border transition-colors flex items-center space-x-1"
                      title="Configure factory permissions"
                    >
                      <FactoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Factories</span>
                    </button>
                  )}

                  {/* Reset Password Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setResetError(null);
                      setResetPassword('');
                      setSelectedUserForPasswordReset(user);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-foreground text-xs font-medium border border-border transition-colors flex items-center space-x-1"
                    title="Set new password for this user"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Password</span>
                  </button>

                  {/* Approval Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleApprovalToggle(user.id, user.is_active)}
                    disabled={isSelf}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                      user.is_active
                        ? 'bg-surface-raised hover:bg-rose-500/10 text-rose-400 border border-border'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium'
                    }`}
                  >
                    {user.is_active ? 'Suspend' : 'Approve'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div 
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-2xl my-8"
          >
            <div>
              <h3 className="text-base font-bold text-foreground">
                Create User Account
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create authenticated login credentials and assign production permissions.
              </p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Vikram Singh"
                    required
                    className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  Login ID / Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. vikram@jbb.com"
                    required
                    className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full min-h-[40px] pl-9 pr-10 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('SUPERVISOR')}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      newRole === 'SUPERVISOR'
                        ? 'bg-foreground text-background font-semibold'
                        : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    Factory Supervisor
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('SALES')}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      newRole === 'SALES'
                        ? 'bg-foreground text-background font-semibold'
                        : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    Salesperson
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised text-foreground hover:bg-surface-overlay text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isCreating ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {selectedUserForPasswordReset && (
        <div 
          onClick={() => setSelectedUserForPasswordReset(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-2xl"
          >
            <div>
              <h3 className="text-base font-bold text-foreground">
                Set New Password
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a new password for <span className="text-foreground font-semibold">{selectedUserForPasswordReset.full_name}</span> ({selectedUserForPasswordReset.email}).
              </p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    required
                    minLength={6}
                    className="w-full min-h-[40px] pl-9 pr-10 rounded-xl bg-surface-raised text-foreground border border-border focus:outline-none focus:border-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPasswordReset(null)}
                  disabled={isResettingPassword}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised text-foreground hover:bg-surface-overlay text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isResettingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Factory Assignment Modal */}
      {selectedUserForFactory && (
        <div 
          onClick={() => setSelectedUserForFactory(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-5 space-y-4 shadow-2xl"
          >
            <div>
              <h3 className="text-base font-bold text-foreground">
                Assign Factories
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select manufacturing facilities {selectedUserForFactory.full_name} is authorized to inspect and supervise.
              </p>
            </div>

            <div className="space-y-2">
              {factories.map((fac) => {
                const isSelected = selectedFactories.includes(fac.id);
                return (
                  <div
                    key={fac.id}
                    onClick={() => toggleFactorySelection(fac.id)}
                    className={`p-3 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-foreground text-background font-semibold border-transparent'
                        : 'bg-surface-raised text-foreground border-border hover:bg-surface-overlay'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium">{fac.factory_name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                        {fac.address}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedUserForFactory(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised text-foreground hover:bg-surface-overlay text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFactoryAccess}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
