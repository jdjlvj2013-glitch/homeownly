// Storage adapter. localStorage is always the offline cache; when signed in,
// state is also synced to Supabase (one profiles_state row per user).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE } from './config.js';

const localBackend = {
  async load(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; },
  async save(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  async clear(key) { localStorage.removeItem(key); },
};
export const backend = localBackend;
export const STATE_KEY = 'homekeep-state-v1';

// PKCE flow: the auth redirect comes back as ?code=… in the query string, so it never
// collides with the app's #/ hash routes on GitHub Pages.
export const supabase = createClient(SUPABASE.url, SUPABASE.key, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
// Where magic links / confirmation emails return to: the app root on the current path (e.g. /homeownly/).
export const redirectUrl = () => location.origin + location.pathname;

// Missing table → friendly "setup not finished" message.
export class SetupMissing extends Error {}
const isMissing = (e) => e && (e.code === 'PGRST205' || e.code === '42P01' || /schema cache|does not exist/i.test(e.message || ''));
const chk = (error) => { if (error) throw isMissing(error) ? new SetupMissing(error.message) : error; };

export const cloud = {
  async load(userId) {
    const { data, error } = await supabase.from('profiles_state').select('data, updated_at').eq('user_id', userId).maybeSingle();
    chk(error); return data;
  },
  async save(userId, state) {
    const { error } = await supabase.from('profiles_state').upsert({ user_id: userId, data: state });
    chk(error);
  },
  async shareUnits(userId, rows) { // rows: [{unit_id, snapshot}]
    if (!rows.length) return;
    const { error } = await supabase.from('unit_shares').upsert(rows.map((r) => ({ ...r, owner: userId })));
    chk(error);
  },
  async getUnit(unitId) {
    const { data, error } = await supabase.from('unit_shares').select('snapshot, updated_at').eq('unit_id', unitId).maybeSingle();
    chk(error); return data;
  },
};
