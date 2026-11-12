import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase, getTenantUsers, createTenantUser, updateTenantUser, deleteTenantUser } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and their role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;
    
    // Only allow admins, managers, and super admins
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get tenant ID from query params
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

// Get users for the tenant from database
     console.log('🔍 API: Getting users for tenant:', tenantId);
     
     let users = await getTenantUsers(tenantId);

     if (!users || users.length === 0) {
       try {
         const { data: dbUsers, error } = await supabase
           .from('User')
           .select('*')
           .eq('tenantid', tenantId);
         
         if (!error && dbUsers) {
           users = dbUsers.map((u: any) => ({
             id: u.id,
             email: u.email,
             firstName: u.firstname,
             lastName: u.lastname,
             role: u.role,
             isActive: u.isactive,
             createdAt: u.createdat,
             lastLogin: u.lastlogin
           }));
         }
       } catch (dbError) {
         console.error('Error fetching users from database:', dbError);
       }
     }

     console.log('📊 API: Users found:', users.length);

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        (u.firstName && u.firstName.toLowerCase().includes(searchLower)) ||
        (u.lastName && u.lastName.toLowerCase().includes(searchLower))
      );
      console.log('🔍 API: Users after search filter:', users.length);
    }

    if (role) {
      users = users.filter(u => u.role === role);
      console.log('🔍 API: Users after role filter:', users.length);
    }

    if (status) {
      const isActive = status === 'active';
      users = users.filter(u => u.isActive === isActive);
      console.log('🔍 API: Users after status filter:', users.length);
    }

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total: users.length,
        page: 1,
        limit: users.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error in GET /api/tenant/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      password,
      role = 'USER',
      tenantId
    } = body;

    if (!email || !password || !tenantId) {
      return NextResponse.json({ 
        error: 'Email, password, and tenantId are required' 
      }, { status: 400 });
    }

    // Verify user has access to this tenant
    if (userRole !== 'SUPER_ADMIN') {
      const { data: userTenant, error: accessError } = await supabase
        .from('User')
        .select('*')
        .eq('authId', userId)
        .eq('tenantid', tenantId)
        .single();

      if (accessError && accessError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
      }
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in Supabase
    const newUser = await createTenantUser({
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role
    });

    // Create user in Clerk
    try {
      const clerkUser = await client.users.createUser({
        emailAddress: [email],
        password: password,
        firstName: firstName || '',
        lastName: lastName || '',
        username: email.split('@')[0],
        publicMetadata: {
          role: role,
          tenantId: tenantId,
          createdBy: userId
        }
      });

      // Update user with Clerk ID
      await supabase
        .from('User')
        .update({ authId: clerkUser.id })
        .eq('id', newUser.id);

    } catch (clerkError: any) {
      console.error('❌ Error creating user in Clerk:', clerkError);
      // Rollback user creation
      await supabase
        .from('User')
        .delete()
        .eq('id', newUser.id);
      
      const errorMessage = clerkError?.errors?.[0]?.message || clerkError?.message || 'Failed to create user in Clerk';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: { ...newUser, passwordHash: undefined }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/tenant/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...userData } = body;

    if (action === 'toggle_status') {
      const { userId: targetUserId } = userData;
      
      if (!targetUserId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      // Get current user status
      const { data: targetUser, error: fetchError } = await supabase
        .from('User')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (fetchError) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Verify tenant access
      if (userRole !== 'SUPER_ADMIN') {
        const { data: currentUser, error: accessError } = await supabase
          .from('User')
          .select('*')
          .eq('authId', userId)
          .eq('tenantid', targetUser.tenantid)
          .single();

        if (accessError) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Toggle status
      const newStatus = !targetUser.isactive;
      const updatedUser = await updateTenantUser(targetUserId, {
        isActive: newStatus,
        firstName: targetUser.firstname,
        lastName: targetUser.lastname,
        role: targetUser.role
      });

      return NextResponse.json({
        success: true,
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
        user: updatedUser
      });
    }

    if (action === 'update_user') {
      const { userId: targetUserId, firstName, lastName, role } = userData;
      
      if (!targetUserId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      // Get current user
      const { data: targetUser, error: fetchError } = await supabase
        .from('User')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (fetchError) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Verify tenant access
      if (userRole !== 'SUPER_ADMIN') {
        const { data: currentUser, error: accessError } = await supabase
          .from('User')
          .select('*')
          .eq('authId', userId)
          .eq('tenantid', targetUser.tenantid)
          .single();

        if (accessError) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Update user
      const updatedUser = await updateTenantUser(targetUserId, {
        firstName,
        lastName,
        role,
        isActive: targetUser.isactive
      });

      // Update Clerk user
      if (targetUser.authId) {
        try {
          await client.users.updateUser(targetUser.authId, {
            firstName: firstName || '',
            lastName: lastName || '',
            publicMetadata: {
              role: role,
              tenantId: targetUser.tenantid
            }
          });
        } catch (clerkError) {
          console.error('❌ Error updating user in Clerk:', clerkError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Error in PATCH /api/tenant/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;

    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from('User')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify tenant access
    if (userRole !== 'SUPER_ADMIN') {
      const { data: currentUser, error: accessError } = await supabase
        .from('User')
        .select('*')
        .eq('authId', userId)
        .eq('tenantid', targetUser.tenantid)
        .single();

      if (accessError) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Delete from Supabase
    await deleteTenantUser(targetUserId);

    // Delete from Clerk
    try {
      if (targetUser.authId) {
        await client.users.deleteUser(targetUser.authId);
      }
    } catch (clerkError) {
      console.error('❌ Error deleting user from Clerk:', clerkError);
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in DELETE /api/tenant/users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
