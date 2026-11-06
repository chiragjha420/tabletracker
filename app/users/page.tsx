'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/components/user-context';
import { dataStore } from '@/lib/data/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile, UserRole, Factory } from '@/types';
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
  Plus,
  Trash2,
  Building2,
  Users as UsersIcon
} from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'users' | 'factories'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
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

  // Add Factory Modal State
  const [showAddFactoryModal, setShowAddFactoryModal] = useState(false);
  const [newFactoryName, setNewFactoryName] = useState('');
  const [newFactoryAddress, setNewFactoryAddress] = useState('');
  const [isAddingFactory, setIsAddingFactory] = useState(false);
  const [factoryError, setFactoryError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = () => {
    // 1. Load Users
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

    // 2. Load Factories
    setFactories(dataStore.getFactories());

    // 3. Sync from Supabase if configured
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

      supabase
        .from('factories')
        .select('*')
        .order('created_at', { ascending: true })
        .then(({ data: remoteFactories, error }) => {
          if (!error && remoteFactories) {
            setFactories(remoteFactories as Factory[]);
            dataStore.setFactories(remoteFactories as Factory[]);
          }
        });
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataStore.subscribe(() => {
      loadData();
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
          Only administrators can access user and facility management controls.
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
    loadData();

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
    loadData();

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

  const openFactoryModal = async (user: UserProfile) => {
    setSelectedUserForFactory(user);
    let userFacs = dataStore.getUserFactoryAccess(user.id);
    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('factory_access').select('factory_id').eq('user_id', user.id);
      if (!error && data) {
        userFacs = data.map((r: any) => r.factory_id);
      }
    }
    setSelectedFactories(userFacs);
  };

  const handleSaveFactoryAccess = async () => {
    if (!selectedUserForFactory) return;
    const targetUserId = selectedUserForFactory.id;
    const facIds = [...selectedFactories];

    const res = dataStore.setUserFactoryAccess(targetUserId, facIds, currentUser.id);
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
      return;
    }
    setFeedbackMessage({ type: 'success', text: `Factory permissions updated for ${selectedUserForFactory.full_name}.` });
    setSelectedUserForFactory(null);

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.from('factory_access').delete().eq('user_id', targetUserId);
      if (facIds.length > 0) {
        const rows = facIds.map(fId => ({ user_id: targetUserId, factory_id: fId }));
        await supabase.from('factory_access').insert(rows);
      }
    }
    loadData();
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
      loadData();
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

  // Handler for Adding a Factory (Admin Only)
  const handleAddFactorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFactoryError(null);
    setIsAddingFactory(true);

    const res = dataStore.addFactory(
      { factory_name: newFactoryName.trim(), address: newFactoryAddress.trim() },
      currentUser.id
    );

    if (!res.success) {
      setFactoryError(res.message);
      setIsAddingFactory(false);
      return;
    }

    const createdFactory = res.factory;
    const supabase = createClient();
    if (supabase && isSupabaseConfigured() && createdFactory) {
      supabase.from('factories').insert({
        id: createdFactory.id,
        factory_name: createdFactory.factory_name,
        address: createdFactory.address,
        is_active: true,
      }).then();
    }

    setFeedbackMessage({ type: 'success', text: `Facility "${newFactoryName.trim()}" added successfully.` });
    setNewFactoryName('');
    setNewFactoryAddress('');
    setShowAddFactoryModal(false);
    setIsAddingFactory(false);
    loadData();
  };

  // Handler for Deleting a Factory (Admin Only)
  const handleDeleteFactory = (factoryId: string, factoryName: string) => {
    if (!confirm(`Are you sure you want to remove manufacturing facility "${factoryName}"?`)) return;

    const res = dataStore.deleteFactory(factoryId, currentUser.id);
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
      return;
    }

    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      supabase.from('factories').delete().eq('id', factoryId).then();
    }

    setFeedbackMessage({ type: 'success', text: `Facility "${factoryName}" removed successfully.` });
    loadData();
  };

  const roles: UserRole[] = ['ADMIN', 'SALES', 'SUPERVISOR'];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Management & Permissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administer user credentials, roles, and manufacturing facilities.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {activeTab === 'users' ? (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center space-x-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFactoryError(null);
                setShowAddFactoryModal(true);
              }}
              className="inline-flex items-center space-x-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
          )}
        </div>
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

      {/* Tab Selector: Users vs Manufacturing Facilities */}
      <div className="flex items-center space-x-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'users'
              ? 'bg-foreground text-background'
              : 'bg-surface text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <UsersIcon className="w-3.5 h-3.5" />
          <span>Users ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('factories')}
          className={`flex items-center space-x-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'factories'
              ? 'bg-foreground text-background'
              : 'bg-surface text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Manufacturing Facilities ({factories.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
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

          {/* User Cards List */}
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-surface border border-border text-xs text-muted-foreground">
                No users found matching the selected filter.
              </div>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUser.id;
                const userFacIds = dataStore.getUserFactoryAccess(user.id);
                const assignedCount = userFacIds.length;

                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl bg-surface border border-border space-y-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-foreground">
                            {user.full_name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-raised text-muted-foreground border border-border">
                              You
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            user.is_active 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {user.is_active ? 'Active' : 'Pending Approval'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.email}
                        </div>
                      </div>

                      {/* Role Pill Switcher */}
                      <div className="flex items-center space-x-1 bg-surface-raised p-1 rounded-xl border border-border self-start sm:self-auto">
                        {roles.map((r) => (
                          <button
                            key={r}
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleRoleChange(user.id, r)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                              user.role === r
                                ? 'bg-foreground text-background shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Supervisor Factory Access Row */}
                    {user.role === 'SUPERVISOR' && (
                      <div className="pt-2 border-t border-divider flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <FactoryIcon className="w-3.5 h-3.5" />
                          <span>
                            {assignedCount === 0
                              ? 'All manufacturing facilities (unrestricted)'
                              : `${assignedCount} facility permission${assignedCount > 1 ? 's' : ''} assigned`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions: Reset Password & Approval Toggle */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-divider">
                      {user.role === 'SUPERVISOR' && (
                        <button
                          type="button"
                          onClick={() => openFactoryModal(user)}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-foreground text-xs font-medium border border-border transition-colors flex items-center space-x-1"
                          title="Configure factory permissions"
                        >
                          <FactoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Assign Facilities</span>
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
        </div>
      )}

      {/* TAB 2: MANUFACTURING FACILITIES CONFIGURATION (ADMIN ONLY) */}
      {activeTab === 'factories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Add, rename, or remove manufacturing facilities. Supervisors can be assigned to one or more of these locations.
            </p>
          </div>

          {factories.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface border border-border text-center space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">No Manufacturing Facilities</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  No factory facilities have been created yet. Add your first facility to assign supervisors and track manufacturing operations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFactoryError(null);
                  setShowAddFactoryModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Facility</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {factories.map((fac) => {
                const assignedSupervisors = dataStore.getSupervisors(fac.id);

                return (
                  <div
                    key={fac.id}
                    className="p-4 rounded-2xl bg-surface border border-border space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          {fac.factory_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFactory(fac.id, fac.factory_name)}
                          className="p-1.5 rounded-xl bg-surface-raised hover:bg-rose-500/10 text-rose-400 transition-colors border border-border"
                          title="Remove facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {fac.address && (
                        <p className="text-xs text-muted-foreground">
                          {fac.address}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-divider flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Authorized Supervisors:</span>
                      <span className="font-semibold text-foreground">
                        {assignedSupervisors.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
            <div className="flex items-center justify-between pb-2 border-b border-divider">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-foreground" />
                <h3 className="text-base font-bold text-foreground">Create User Account</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* Login Email */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Login Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@jbb.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Password (min 6 characters)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Role</label>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-2xl my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-divider">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-foreground" />
                <h3 className="text-base font-bold text-foreground">Set New Password</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUserForPasswordReset(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Directly assign a new login password for <span className="font-semibold text-foreground">{selectedUserForPasswordReset.email}</span>.
            </p>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-divider">
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
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FACTORY MODAL (ADMIN ONLY) */}
      {showAddFactoryModal && (
        <div 
          onClick={() => setShowAddFactoryModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-2xl my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-divider">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-foreground" />
                <h3 className="text-base font-bold text-foreground">Add Manufacturing Facility</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddFactoryModal(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {factoryError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{factoryError}</span>
              </div>
            )}

            <form onSubmit={handleAddFactorySubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Facility / Factory Name</label>
                <input
                  type="text"
                  required
                  value={newFactoryName}
                  onChange={(e) => setNewFactoryName(e.target.value)}
                  placeholder="e.g. Unit 3 (Finishing & Assembly)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-medium">Address / Location Details (optional)</label>
                <input
                  type="text"
                  value={newFactoryAddress}
                  onChange={(e) => setNewFactoryAddress(e.target.value)}
                  placeholder="e.g. Plot 18, Industrial Estate, Bangalore"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setShowAddFactoryModal(false)}
                  disabled={isAddingFactory}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised text-foreground hover:bg-surface-overlay text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingFactory}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isAddingFactory ? 'Adding Facility...' : 'Add Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SUPERVISOR FACTORY MODAL */}
      {selectedUserForFactory && (
        <div 
          onClick={() => setSelectedUserForFactory(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-3xl bg-surface border border-border p-6 space-y-4 shadow-2xl my-8"
          >
            <div className="flex items-center justify-between pb-2 border-b border-divider">
              <div className="flex items-center space-x-2">
                <FactoryIcon className="w-5 h-5 text-foreground" />
                <h3 className="text-base font-bold text-foreground">Assign Facilities</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedUserForFactory(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select which manufacturing facilities <span className="font-semibold text-foreground">{selectedUserForFactory.full_name}</span> is authorized to claim and supervise tables for.
            </p>

            {factories.length === 0 ? (
              <div className="p-5 rounded-2xl bg-surface-raised border border-border text-center space-y-3 my-2">
                <Building2 className="w-7 h-7 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-foreground">No Manufacturing Facilities Created</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    You haven't created any facilities yet. Add your first facility to assign supervisors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForFactory(null);
                    setActiveTab('factories');
                    setFactoryError(null);
                    setShowAddFactoryModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Facility Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
                {factories.map((fac) => {
                  const isSelected = selectedFactories.includes(fac.id);
                  return (
                    <div
                      key={fac.id}
                      onClick={() => toggleFactorySelection(fac.id)}
                      className={`p-3 rounded-2xl border cursor-pointer select-none flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-foreground text-background font-semibold border-transparent'
                          : 'bg-surface-raised text-foreground border-border hover:bg-surface-overlay'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold truncate">{fac.factory_name}</div>
                        {fac.address && (
                          <div className={`text-[10px] truncate ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                            {fac.address}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <Check className="w-4 h-4 text-background" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setSelectedUserForFactory(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-surface-raised text-foreground hover:bg-surface-overlay text-xs font-medium"
              >
                Cancel
              </button>
              {factories.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveFactoryAccess}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90"
                >
                  Save Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
