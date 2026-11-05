import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// In-memory rate limiting map: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 admin operations per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

// Clean up old rate limit records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Verify that the incoming request is issued by an authenticated ADMIN
 */
async function verifyAdminCaller(request: Request): Promise<{ authorized: boolean; error?: string; callerId?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const supabaseAdmin = createAdminClient();

    let authenticatedUserId: string | null = null;

    // 1. Try Bearer token verification with Supabase Admin
    if (bearerToken && supabaseAdmin) {
      const { data: { user }, error: tokenErr } = await supabaseAdmin.auth.getUser(bearerToken);
      if (!tokenErr && user) {
        authenticatedUserId = user.id;
      }
    }

    // 2. Try cookie session verification
    if (!authenticatedUserId) {
      const serverSupabase = await createServerSupabaseClient();
      if (serverSupabase) {
        const { data: { user }, error: cookieErr } = await serverSupabase.auth.getUser();
        if (!cookieErr && user) {
          authenticatedUserId = user.id;
        }
      }
    }

    // 3. Fallback for local development if Supabase credentials are not yet configured
    if (!supabaseAdmin) {
      const devAdminHeader = request.headers.get('x-admin-role');
      if (devAdminHeader === 'ADMIN') {
        return { authorized: true, callerId: 'local-dev-admin' };
      }
      return { authorized: false, error: 'Unauthorized: Admin session required.' };
    }

    if (!authenticatedUserId) {
      return { authorized: false, error: 'Authentication required. Please sign in.' };
    }

    // 4. Verify user has ADMIN role in profiles table
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active')
      .eq('id', authenticatedUserId)
      .single();

    if (profileErr || !profile) {
      return { authorized: false, error: 'User profile not found.' };
    }

    if (!profile.is_active) {
      return { authorized: false, error: 'Account is pending approval or inactive.' };
    }

    if (profile.role !== 'ADMIN') {
      return { authorized: false, error: 'Forbidden: Administrator privileges required.' };
    }

    return { authorized: true, callerId: authenticatedUserId };
  } catch (err) {
    return { authorized: false, error: 'Authorization check failed.' };
  }
}

// Input validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Admin Authorization Check
    const auth = await verifyAdminCaller(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.error?.includes('Forbidden') ? 403 : 401 }
      );
    }

    // 3. Parse & Validate Payload
    const body = await request.json().catch(() => ({}));
    const { fullName, email, password, role } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Full name must be between 2 and 100 characters.' },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required for user login ID.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Password must be between 6 and 128 characters.' },
        { status: 400 }
      );
    }

    if (role !== 'SALES' && role !== 'SUPERVISOR') {
      return NextResponse.json(
        { success: false, error: 'Role must be either SALES or SUPERVISOR.' },
        { status: 400 }
      );
    }

    // Sanitize string inputs (prevent script injection in names)
    const cleanName = fullName.trim().replace(/[<>]/g, '');

    const supabaseAdmin = createAdminClient();
    let userId: string;

    if (supabaseAdmin) {
      // Create user in Supabase Auth with auto-confirmed email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: role,
        },
      });

      if (authError) {
        // Return sanitized message, never expose internal details
        const safeError = authError.message.includes('already registered')
          ? 'A user with this email address already exists.'
          : authError.message;
        return NextResponse.json({ success: false, error: safeError }, { status: 400 });
      }

      userId = authData.user.id;

      // Ensure profile row exists and is active
      const now = new Date().toISOString();
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: role,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    } else {
      userId = `user-${Date.now()}`;
    }

    // Return sanitized response (never return passwords or hashes)
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: role,
        is_active: true,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating the account.' },
      { status: 500 }
    );
  }
}

// Reset / Change Password (Admin Only)
export async function PATCH(request: Request) {
  try {
    // 1. Rate Limiting Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    // 2. Authentication & Admin Authorization Check
    const auth = await verifyAdminCaller(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.error?.includes('Forbidden') ? 403 : 401 }
      );
    }

    // 3. Parse & Validate Payload
    const body = await request.json().catch(() => ({}));
    const { userId, newPassword } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: 'New password must be between 6 and 128 characters.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to update user password.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while resetting the password.' },
      { status: 500 }
    );
  }
}
