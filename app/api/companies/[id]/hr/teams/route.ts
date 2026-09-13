import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');
  const employeeId = searchParams.get('employee_id');

  let query = getSupabaseServer()
    .from('employee_teams')
    .select('*')
    .eq('tenant_id', companyId);

  if (department) {
    query = query.eq('department', department);
  }

  const { data: teams, error } = await query.order('name', { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });

  if (!teams || teams.length === 0) return NextResponse.json([]);

  const teamIds = teams.map(t => t.id);
  let membersQuery = getSupabaseServer()
    .from('team_members')
    .select('*')
    .eq('tenant_id', companyId)
    .in('team_id', teamIds);

  if (employeeId) {
    membersQuery = membersQuery.eq('employee_id', employeeId);
  }

  const { data: members } = await membersQuery;

  const result = teams.map(team => ({
    ...team,
    members: (members || []).filter(m => m.team_id === team.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { name, department, description, color, member_ids } = body as {
    name: string;
    department: string;
    description?: string;
    color?: string;
    member_ids?: string[];
  };

  if (!name || !department) {
    return NextResponse.json({ error: 'Missing name or department' }, { status: 400 });
  }

  const { data: team, error } = await getSupabaseServer()
    .from('employee_teams')
    .insert({
      tenant_id: companyId,
      name,
      department,
      description: description || null,
      color: color || '#3b82f6',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (member_ids && member_ids.length > 0) {
    const rows = member_ids.map((eid, i) => ({
      tenant_id: companyId,
      team_id: team.id,
      employee_id: eid,
      role: i === 0 ? 'leader' : 'member',
    }));
    await getSupabaseServer().from('team_members').insert(rows);
  }

  return NextResponse.json(team);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const body = await request.json();
  const { id, name, department, description, color, member_ids } = body as {
    id: string;
    name?: string;
    department?: string;
    description?: string;
    color?: string;
    member_ids?: string[];
  };

  if (!id) return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (department !== undefined) updates.department = department;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;
  updates.updated_at = new Date().toISOString();

  const { error } = await getSupabaseServer()
    .from('employee_teams')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (member_ids !== undefined) {
    await getSupabaseServer()
      .from('team_members')
      .delete()
      .eq('team_id', id)
      .eq('tenant_id', companyId);

    if (member_ids.length > 0) {
      const rows = member_ids.map((eid, i) => ({
        tenant_id: companyId,
        team_id: id,
        employee_id: eid,
        role: i === 0 ? 'leader' : 'member',
      }));
      await getSupabaseServer().from('team_members').insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('id');

  if (!teamId) return NextResponse.json({ error: 'Missing team id' }, { status: 400 });

  const { error } = await getSupabaseServer()
    .from('employee_teams')
    .delete()
    .eq('id', teamId)
    .eq('tenant_id', companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
