// Demo data: one event with the Pizza + Mazza example.
// Usage: npm run seed   (reads .env.local)
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const PASSWORD = 'festival123';
const today = new Date().toISOString().slice(0, 10);

const { data: event, error } = await db
  .from('events')
  .insert({
    title: 'Lantern Night Demo',
    tagline: 'Pizza, mazza and a fair split',
    theme: 'lantern',
    starts_on: today,
    password_hash: await bcrypt.hash(PASSWORD, 10),
  })
  .select('id')
  .single();
if (error) throw error;

const names = ['Rekha', 'Arun', 'Rahul', 'Nikita', 'Viren'];
const { data: people, error: e2 } = await db
  .from('participants')
  .insert(names.map((n) => ({ event_id: event.id, display_name: n, email: `${n.toLowerCase()}@example.com`, emoji: '🎉' })))
  .select('id,display_name');
if (e2) throw e2;
const id = Object.fromEntries(people.map((p) => [p.display_name, p.id]));

const { error: e3 } = await db.from('expenses').insert([
  { event_id: event.id, spent_on: today, title: 'Pizza', amount_paise: 40000, paid_by: id.Arun, added_by: 'admin' },
  { event_id: event.id, spent_on: today, title: 'Mazza', amount_paise: 3500, paid_by: id.Rahul, added_by: 'admin' },
]);
if (e3) throw e3;

console.log(`Created demo event ${event.id}`);
console.log(`Shared password: ${PASSWORD}`);
console.log('Participant emails: rekha@example.com, arun@example.com, ... (issue a code in the admin panel to sign in)');
