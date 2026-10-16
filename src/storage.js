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
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
});
// Where magic links / confirmation emails return to: the app root on the current path (e.g. /homeownly/).
export const PAGES_URL = 'https://jdjlvj2013-glitch.github.io/homeownly/';
export const redirectUrl = () => (import.meta.env.PROD && location.hostname.endsWith('github.io') ? PAGES_URL : location.origin + location.pathname);
export const LAST_EMAIL_KEY = 'homeownly-last-auth-email';

// Auth callback: runs once in main.jsx BEFORE the app renders, routes, or seeds demo data.
// Handles ?code= (PKCE), ?token_hash=&type= (verifyOtp — works in any browser), #access_token= (implicit),
// and ?error= / #error=. Always cleans the URL. Returns { status, email?, message? }.
export async function handleAuthCallback() {
  const q = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.replace(/^#\/?\??/, ''));
  const get = (k) => q.get(k) || h.get(k);
  const isCallback = ['code', 'token_hash', 'access_token', 'error', 'error_description'].some((k) => get(k));
  if (!isCallback) return { status: 'none' };
  const remembered = localStorage.getItem(LAST_EMAIL_KEY) || '';
  let res;
  try {
    if (get('error') || get('error_description')) {
      res = { status: 'error', email: remembered, message: (get('error_description') || get('error')).replace(/\+/g, ' ') };
    } else if (get('token_hash')) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: get('token_hash'), type: get('type') || 'email' });
      res = error ? { status: 'error', email: remembered, message: error.message } : { status: 'signed-in', email: data.user?.email };
    } else if (get('access_token') && get('refresh_token')) {
      const { data, error } = await supabase.auth.setSession({ access_token: get('access_token'), refresh_token: get('refresh_token') });
      res = error ? { status: 'error', email: remembered, message: error.message } : { status: 'signed-in', email: data.user?.email };
    } else if (get('code')) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(get('code'));
      // Missing PKCE verifier = link opened in another browser (e.g. the mail app). Supabase has already
      // confirmed the email when it redirected here, so the user just needs to sign in.
      res = error ? { status: 'confirmed-signin', email: remembered, message: error.message } : { status: 'signed-in', email: data.user?.email };
    }
  } catch (e) { res = { status: 'confirmed-signin', email: remembered, message: e.message }; }
  history.replaceState(null, '', location.pathname + (res.status === 'signed-in' ? '#/home' : '#/auth'));
  return res || { status: 'none' };
}

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
