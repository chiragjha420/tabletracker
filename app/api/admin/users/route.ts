import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, password, role, factoryIds } = body;

    // Basic Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full name is required (minimum 2 characters).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid email / login ID is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (role !== 'SALES' && role !== 'SUPERVISOR') {
      return NextResponse.json({ success: false, error: 'Role must be either SALES or SUPERVISOR.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const supabaseAdmin = createAdminClient();

    let userId: string;

    if (supabaseAdmin) {
      // 1. Create account in Supabase Auth with pre-confirmed email
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
        return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
      }

      userId = authData.user.id;

      // 2. Insert/Upsert into public.profiles as active user
      const now = new Date().toISOString();
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: role,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      if (profileError) {
        console.error('Error creating profile row:', profileError);
      }

      // 3. Assign factory access for supervisors
      if (role === 'SUPERVISOR' && Array.isArray(factoryIds) && factoryIds.length > 0) {
        const rows = factoryIds.map((fId: string) => ({
          user_id: userId,
          factory_id: fId,
        }));
        const { error: facError } = await supabaseAdmin.from('factory_access').insert(rows);
        if (facError) {
          console.error('Error assigning factory access:', facError);
        }
      }
    } else {
      // Local fallback ID
      userId = `user-${Date.now()}`;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: role,
        is_active: true,
        factoryIds: Array.isArray(factoryIds) ? factoryIds : [],
      },
    });
  } catch (err: any) {
    console.error('Error in create user API:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reset / Change Password
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'User ID and a new password with at least 6 characters are required.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
