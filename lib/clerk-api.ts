// Clerk Backend REST API helper (replaces deprecated @clerk/clerk-sdk-node)
// Docs: https://clerk.com/docs/reference/backend-api

const CLERK_API_BASE = 'https://api.clerk.com/v1';

function getClerkSecretKey(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error('CLERK_SECRET_KEY environment variable is required');
  return key;
}

function clerkHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${getClerkSecretKey()}`,
    'Content-Type': 'application/json',
  };
}

export interface ClerkUser {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  public_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
  private_metadata: Record<string, any>;
  created_at: number;
  primary_email_address_id: string;
}

export async function clerkGetUserList(params?: { limit?: number; email_address?: string[] }): Promise<ClerkUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.email_address) {
    params.email_address.forEach(e => searchParams.append('email_address', e));
  }
  const qs = searchParams.toString();
  const res = await fetch(`${CLERK_API_BASE}/users${qs ? `?${qs}` : ''}`, {
    headers: clerkHeaders(),
  });
  if (!res.ok) throw new Error(`Clerk API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data || json;
}

export async function clerkGetUser(userId: string): Promise<ClerkUser> {
  const res = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    headers: clerkHeaders(),
  });
  if (!res.ok) throw new Error(`Clerk API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function clerkUpdateUser(userId: string, data: {
  public_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
  first_name?: string;
  last_name?: string;
}): Promise<ClerkUser> {
  const res = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    method: 'PATCH',
    headers: clerkHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Clerk API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function clerkCreateUser(data: {
  email_address: string[];
  first_name?: string;
  last_name?: string;
  password?: string;
  username?: string;
  public_metadata?: Record<string, any>;
}): Promise<ClerkUser> {
  const res = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: clerkHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Clerk API error: ${res.status} ${body.errors?.[0]?.message || JSON.stringify(body)}`);
  }
  return res.json();
}

export async function clerkDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: clerkHeaders(),
  });
  if (!res.ok) throw new Error(`Clerk API error: ${res.status} ${await res.text()}`);
}
