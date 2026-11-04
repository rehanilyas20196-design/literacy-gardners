const { getDb } = require('../connection');

async function listTeam() {
  const db = getDb();
  const { data, error } = await db
    .from('team_members')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listAuthors() {
  const db = getDb();
  const { data, error } = await db.from('authors').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function createTeamMember(member) {
  const db = getDb();
  const payload = {
    name: member.name,
    role: member.role,
    bio: member.bio ?? null,
    initial: member.initial,
    sort_order: member.sort_order ?? 0,
  };
  const { data, error } = await db.from('team_members').insert(payload).select().single();
  if (error) throw error;
  return { id: data.id, ...payload };
}

async function deleteTeamMember(id) {
  const db = getDb();
  const { error } = await db.from('team_members').delete().eq('id', id);
  if (error) throw error;
  return { id, deleted: true };
}

module.exports = { listTeam, listAuthors, createTeamMember, deleteTeamMember };
