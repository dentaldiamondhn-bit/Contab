import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { auth, clerkClient } from '@clerk/nextjs/server';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  message: string;
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('Tenant').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { name: 'Supabase DB', status: 'degraded', latency, message: error.message };
    }
    return { name: 'Supabase DB', status: 'operational', latency, message: `${latency}ms` };
  } catch (e: any) {
    return { name: 'Supabase DB', status: 'down', latency: Date.now() - start, message: e.message || 'Connection failed' };
  }
}

async function checkClerk(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const client = await clerkClient();
    // Try a lightweight operation
    await client.users.getUserList({ limit: 1 });
    const latency = Date.now() - start;
    return { name: 'Clerk Auth', status: 'operational', latency, message: `${latency}ms` };
  } catch (e: any) {
    const latency = Date.now() - start;
    if (e?.status === 401 || e?.status === 403) {
      return { name: 'Clerk Auth', status: 'operational', latency, message: `${latency}ms (auth ok)` };
    }
    return { name: 'Clerk Auth', status: 'down', latency, message: e.message || 'Connection failed' };
  }
}

async function checkAPI(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/stats`, {
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    if (res.ok) {
      return { name: 'API Contab', status: 'operational', latency, message: `${latency}ms - ${res.status}` };
    }
    return { name: 'API Contab', status: 'degraded', latency, message: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: 'API Contab', status: 'down', latency: Date.now() - start, message: e.message || 'Unreachable' };
  }
}

async function checkVercel(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const res = await fetch('https://api.vercel.com/v2/ping', { cache: 'no-store' });
    const latency = Date.now() - start;
    if (res.ok) {
      return { name: 'Vercel Hosting', status: 'operational', latency, message: `${latency}ms` };
    }
    return { name: 'Vercel Hosting', status: 'degraded', latency, message: `HTTP ${res.status}` };
  } catch (e: any) {
    return { name: 'Vercel Hosting', status: 'down', latency: Date.now() - start, message: e.message || 'Unreachable' };
  }
}

async function checkClerkJWT(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await auth();
    const latency = Date.now() - start;
    return { name: 'Clerk JWT', status: 'operational', latency, message: `${latency}ms` };
  } catch (e: any) {
    return { name: 'Clerk JWT', status: 'down', latency: Date.now() - start, message: e.message || 'Token validation failed' };
  }
}

async function checkSupabaseRealtime(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const supabase = createServiceRoleClient();
    const channel = supabase.channel('health-check');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.unsubscribe();
        reject(new Error('Timeout'));
      }, 5000);
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve();
        }
      });
    });
    const latency = Date.now() - start;
    return { name: 'Supabase Realtime', status: 'operational', latency, message: `${latency}ms` };
  } catch (e: any) {
    return { name: 'Supabase Realtime', status: 'degraded', latency: Date.now() - start, message: e.message || 'Connection failed' };
  }
}

export async function GET() {
  const results = await Promise.all([
    checkSupabase(),
    checkClerk(),
    checkClerkJWT(),
    checkAPI(),
    checkVercel(),
    checkSupabaseRealtime(),
  ]);

  const allOperational = results.every(r => r.status === 'operational');
  const anyDown = results.some(r => r.status === 'down');

  return NextResponse.json({
    overall: anyDown ? 'down' : allOperational ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    services: results,
  });
}
