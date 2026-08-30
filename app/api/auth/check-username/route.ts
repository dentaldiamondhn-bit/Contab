import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase-db';

async function isUsernameTaken(username: string): Promise<boolean> {
  const trimmed = username.trim().toLowerCase();
  // 1. Check Clerk
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({ username: [trimmed] } as any);
    // @ts-ignore - different SDK versions return data differently
    const users = (list as any).data ?? (list as any).users ?? list;
    if (Array.isArray(users) && users.length > 0) return true;
    // Fallback: some SDKs return totalCount
    if ((list as any).totalCount > 0) return true;
  } catch (e) {
    // ignore Clerk check errors, fallback to Supabase
    console.warn('[CHECK-USERNAME] Clerk check failed, fallback to Supabase', e);
  }

  // 2. Check Supabase users table via username in unsafeMetadata? 
  // Since User model has no username column, check if any user has username stored in a potential column
  // Try searching in users table for username-like fields if they exist
  try {
    // Check if there's a username column (may not exist, ignore error)
    const { data, error } = await supabase.from('users').select('id').eq('username', trimmed).maybeSingle();
    if (data) return true;
    if (error && error.code !== '42P01' && error.code !== '42703') {
      // other errors, ignore
    }
  } catch {}

  // Also check firstName+lastName derived? Not needed

  return false;
}

function generateSuggestions(base: string): string[] {
  const clean = base.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const year = new Date().getFullYear();
  const baseSuggestions = [
    `${clean}123`,
    `${clean}_${year}`,
    `${clean}_01`,
    `${clean}01`,
    `${clean}_${Math.floor(Math.random() * 900) + 100}`,
  ];
  // Deduplicate and ensure not equal to base
  const uniq = Array.from(new Set(baseSuggestions.filter(s => s !== clean)));
  return uniq.slice(0, 3);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ message: 'Username requerido' }, { status: 400 });
  }

  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return NextResponse.json({ available: false, exists: false, suggestions: [], reason: 'too_short' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return NextResponse.json({ available: false, exists: false, suggestions: [], reason: 'invalid_chars' });
  }

  try {
    const taken = await isUsernameTaken(trimmed);

    if (!taken) {
      return NextResponse.json({ available: true, exists: false, username: trimmed, suggestions: [] });
    }

    // Generate 3 available suggestions
    const candidates = generateSuggestions(trimmed);
    const availableSuggestions: string[] = [];
    for (const cand of candidates) {
      if (availableSuggestions.length >= 3) break;
      const candTaken = await isUsernameTaken(cand);
      if (!candTaken) availableSuggestions.push(cand);
    }
    // If still less than 3, generate numeric variants
    let i = 1;
    while (availableSuggestions.length < 3 && i < 20) {
      const cand = `${trimmed}${i}${Math.floor(Math.random() * 9)}`;
      if (!availableSuggestions.includes(cand) && !candidates.includes(cand)) {
        const candTaken = await isUsernameTaken(cand);
        if (!candTaken) availableSuggestions.push(cand);
      }
      i++;
    }

    return NextResponse.json({
      available: false,
      exists: true,
      username: trimmed,
      suggestions: availableSuggestions.slice(0, 3),
    });
  } catch (error) {
    console.error('[CHECK-USERNAME] Error:', error);
    return NextResponse.json({ message: 'Error verificando usuario' }, { status: 500 });
  }
}
