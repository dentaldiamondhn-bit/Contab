import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabase, getTenantUsers, setTenantContext } from '@/lib/supabase-db';

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

    // Verify user has access to this tenant
    const userTenant = await db.user.findFirst({
      where: {
        authId: userId,
        tenantId: tenantId
      }
    });

    if (!userTenant && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Build where clause
    const whereClause: any = {
      tenantId: tenantId,
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (status === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (status === 'INACTIVE') {
      whereClause.isActive = false;
    }

    // Get users
    const users = await db.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and their role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;
    
    // Only allow admins, managers, and super admins to create users
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📦 Received body:', body);
    
    const {
      email,
      firstName,
      lastName,
      password,
      role = 'USER',
      tenantId
    } = body;

    console.log('📋 Parsed data:', { email, firstName, lastName, password: '***', role, tenantId });

    // Validate required fields
    if (!email || !password || !tenantId) {
      console.error('❌ Missing required fields:', { hasEmail: !!email, hasPassword: !!password, hasTenantId: !!tenantId });
      return NextResponse.json({ error: 'Email, password, and tenantId are required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const userTenant = await db.user.findFirst({
      where: {
        authId: userId,
        tenantId: tenantId
      }
    });

    if (!userTenant && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if user already exists in Clerk
    try {
      const existingClerkUsers = await client.users.getUserList({
        emailAddress: [email]
      });

      if (existingClerkUsers.data.length > 0) {
        return NextResponse.json({ error: 'User already exists in Clerk' }, { status: 409 });
      }
    } catch (clerkError) {
      console.error('Error checking existing user in Clerk:', clerkError);
    }

    // Check if email is already taken in this tenant
    const existingEmail = await db.user.findFirst({
      where: {
        email: email,
        tenantId: tenantId
      }
    });

    if (existingEmail) {
      return NextResponse.json({ error: 'Email already taken in this tenant' }, { status: 409 });
    }

    // Check tenant user limit
    const currentUsersCount = await db.user.count({
      where: { tenantId: tenantId }
    });

    if (currentUsersCount >= tenant.maxUsers) {
      return NextResponse.json({ error: `Tenant user limit (${tenant.maxUsers}) reached` }, { status: 400 });
    }

    // Create user in Clerk
    let clerkUser;
    try {
      clerkUser = await client.users.createUser({
        emailAddress: [email],
        password: password,
        firstName: firstName || '',
        lastName: lastName || '',
        username: email.split('@')[0], // Use email prefix as username
        publicMetadata: {
          role: role,
          tenantId: tenantId,
          createdBy: userId
        }
      });
    } catch (clerkError: any) {
      console.error('Error creating user in Clerk:', clerkError);
      const errorMessage = clerkError?.errors?.[0]?.message || clerkError?.message || 'Failed to create user in Clerk';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Create user in local database
    try {
      const newUser = await db.user.create({
        data: {
          authId: clerkUser.id,
          email: email,
          firstName: firstName || '',
          lastName: lastName || '',
          role: role,
          isActive: true,
          tenantId: tenantId,
          password: password // Store password temporarily for verification
        }
      });

      return NextResponse.json({ 
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      });
    } catch (dbError) {
      console.error('Error creating user in database:', dbError);
      
      // Rollback: delete from Clerk if database creation fails
      try {
        await client.users.deleteUser(clerkUser.id);
      } catch (rollbackError) {
        console.error('Error rolling back Clerk user:', rollbackError);
      }
      
      return NextResponse.json({ error: 'Failed to create user in database' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating tenant user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and their role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;
    
    // Only allow admins, managers, and super admins to modify users
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, action } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
    const userTenant = await db.user.findFirst({
      where: {
        authId: userId,
        tenantId: targetUser.tenantId
      }
    });

    if (!userTenant && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'toggle_status') {
      // Toggle user status in local database
      const updatedUser = await db.user.update({
        where: { id: targetUserId },
        data: { isActive: !targetUser.isActive }
      });

      // Note: We don't update status in Clerk directly as the property is not available
      // The status is managed locally in our database

      return NextResponse.json({ 
        message: 'User status updated successfully',
        isActive: updatedUser.isActive
      });
    }

    if (action === 'update_user') {
      const { userData } = body;
      
      // Update user in local database
      const updatedUser = await db.user.update({
        where: { id: targetUserId },
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: userData.isActive
        }
      });

      // Update user in Clerk
      try {
        if (targetUser.authId) {
          await client.users.updateUser(targetUser.authId, {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            publicMetadata: {
              role: userData.role,
              tenantId: targetUser.tenantId
            }
          });
        }
      } catch (clerkError) {
        console.error('Error updating user in Clerk:', clerkError);
      }

      return NextResponse.json({ 
        message: 'User updated successfully',
        user: updatedUser
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating tenant user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and their role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userRole = user.publicMetadata?.role as string;
    
    // Only allow admins, managers, and super admins to delete users
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-deletion
    if (targetUser.authId === userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const userTenant = await db.user.findFirst({
      where: {
        authId: userId,
        tenantId: targetUser.tenantId
      }
    });

    if (!userTenant && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Delete user from local database
    try {
      await db.user.delete({
        where: { id: targetUserId }
      });
    } catch (dbError) {
      console.error('Error deleting user from database:', dbError);
      return NextResponse.json({ error: 'Failed to delete user from database' }, { status: 500 });
    }

    // Delete user from Clerk
    try {
      if (targetUser.authId) {
        await client.users.deleteUser(targetUser.authId);
      }
    } catch (clerkError) {
      console.error('Error deleting user from Clerk:', clerkError);
      // Note: We don't rollback the database deletion here since it's better to have
      // the user deleted from our system even if Clerk deletion fails
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
