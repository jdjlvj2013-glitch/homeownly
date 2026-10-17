// Data-tag OCR parsing + unit QR snapshot encoding.
import { BRANDS } from './decode.js';

const BRAND_WORDS = [
  ['carrier', /\b(carrier|bryant|payne)\b/i], ['trane', /\b(trane|american\s+standard)\b/i], ['lennox', /\blennox\b/i],
  ['goodman', /\b(goodman|amana|daikin)\b/i], ['rheem', /\b(rheem|ruud)\b/i], ['york', /\b(york|luxaire|coleman)\b/i],
];
// Pull brand / model / serial out of OCR text. Results are suggestions — the user always confirms.
export function parseTag(text) {
  const t = (text || '').toUpperCase().replace(/[|]/g, 'I');
  const brand = (BRAND_WORDS.find(([, re]) => re.test(t)) || ['other'])[0];
  const grab = (re) => { const m = t.match(re); return m ? m[1].replace(/[^A-Z0-9-]/g, '') : ''; };
  const model = grab(/\bM(?:ODEL|OD|\/N)?\.?\s*(?:NO|NUMBER|#)?\.?\s*[:.#]?\s*([A-Z0-9][A-Z0-9-]{4,})/);
  const serial = grab(/\bS(?:ERIAL|ER|\/N)?\.?\s*(?:NO|NUMBER|#)?\.?\s*[:.#]?\s*([A-Z0-9]{6,})/);
  return { brand, model, serial, brandLabel: BRANDS.find((b) => b.id === brand)?.label, found: !!(model || serial) };
}

// ---- Unit QR snapshot ----
// Live labels encode #/unit/<unitId> and are looked up in Supabase (unit_shares).
// Older labels encode a base64 snapshot in the URL; both still open.
// Privacy: never include owner name, address, costs or notes.
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
export const PART_RE = /(capacitor|contactor|igniter|ignitor|flame sensor|blower motor|motor|coil|drain line|float switch|filter|compressor|txv|thermostat|board|relay)/gi;
export function makeSnapshot(eq, services, max = 12) {
  const sv = services.filter((s) => s.equipmentId === eq.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, max); // keep the QR scannable
  const ind = eq.indoor || {};
  return { v: 2, u: eq.unitId, a: new Date().toLocaleDateString('en-CA'), b: eq.brand, m: eq.model, s: eq.serial, i: eq.installDate || '', o: eq.outdoorType || '',
    p: eq.packageUnit ? 1 : 0, x: !eq.packageUnit && (ind.model || ind.serial || ind.type) ? { t: ind.type || '', b: ind.brand || 'other', m: ind.model || '', s: ind.serial || '' } : null,
    h: sv.map((x) => [x.date, x.work.slice(0, 60), x.company]), n: services.filter((s) => s.equipmentId === eq.id).length };
}
export const encodeSnapshot = (o) => b64(JSON.stringify(o));
export function decodeSnapshot(str) { try { return JSON.parse(unb64(str)); } catch { return null; } }
export const liveUnitUrl = (unitId) => `${location.origin}${location.pathname}#/unit/${unitId}`;
export const unitUrl = (snap) => `${location.origin}${location.pathname}#/unit/${encodeSnapshot(snap)}`;
