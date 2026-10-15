// Storage adapter. Prototype uses localStorage; swap `backend` for a Supabase
// implementation later (same load/save interface: async load(key) / save(key, value)).
const localBackend = {
  async load(key) { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; },
  async save(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  async clear(key) { localStorage.removeItem(key); },
};
// export const supabaseBackend = { load: (k)=>supabase.from('state').select()..., save: ... }
export const backend = localBackend;
export const STATE_KEY = 'homekeep-state-v1';
