'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { AlertCircle, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<'SUPERVISOR' | 'SALES'>('SUPERVISOR');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const hasSupabase = isSupabaseConfigured();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (supabase && hasSupabase) {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: requestedRole,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        setSuccess('Registration successful! Your account is created and will be active once approved by the factory administrator.');
        setLoading(false);
      }
    } else {
      // Local setup notification
      setSuccess('Registration received! When connected to Supabase, your account will be saved in auth.users.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-surface border border-border space-y-5 shadow-2xl">
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="text-xs text-muted-foreground">
            Register for factory production access
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-400 text-xs flex items-center space-x-2 border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 text-xs space-y-2 border border-emerald-500/20">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Registration Submitted</span>
            </div>
            <p className="leading-relaxed">{success}</p>
            <div className="pt-1">
              <Link
                href="/login"
                className="inline-block px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Singh"
                  required
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full min-h-[44px] pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-surface-raised text-foreground placeholder:text-muted border border-border focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Requested Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestedRole('SUPERVISOR')}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    requestedRole === 'SUPERVISOR'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  Factory Supervisor
                </button>
                <button
                  type="button"
                  onClick={() => setRequestedRole('SALES')}
                  className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    requestedRole === 'SALES'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-surface-raised text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  Salesperson
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? 'Creating...' : 'Register Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-muted-foreground">
          <span>Already have an account? </span>
          <Link href="/login" className="text-foreground font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
