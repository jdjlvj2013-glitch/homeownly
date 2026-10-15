import { MONROE_NORMALS } from './climate.js';
import { PRICING, FILTER_PARTNER } from './config.js';
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
export const money = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: Number(n || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const fmtDate = (d) => d ? new Date(d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const addMonths = (d, n) => { const x = new Date(d + 'T12:00'); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };
export const daysUntil = (d) => Math.round((new Date(d + 'T12:00') - new Date()) / 864e5);

// ---- Plan / trial ----
export function planStatus(plan) {
  if (plan.subscribed) return { entitled: true, label: `Plus (${plan.interval})` };
  if (!plan.trialStart) return { entitled: false, notStarted: true, label: 'Free' };
  const left = PRICING.trialDays - Math.floor((Date.now() - new Date(plan.trialStart)) / 864e5);
  return left > 0 ? { entitled: true, trial: true, daysLeft: left, label: `Free trial · ${left} days left` }
                  : { entitled: false, expired: true, label: 'Trial ended' };
}

// ---- Filter affiliate URL ----
export function filterUrl(size) {
  const [w, h, d] = (size || '').split('x');
  return FILTER_PARTNER.urlPattern.replace('{size}', encodeURIComponent(size)).replace('{w}', w).replace('{h}', h)
    .replace('{d}', d).replace('{ref}', encodeURIComponent(FILTER_PARTNER.affiliateRef));
}

// ---- Power Bill Check ----
// Compares each bill with (a) same month last year and (b) usage per degree-day vs the home's own typical.
// Uses Monroe, LA normals, so it can't see an unusually hot/cold actual month — wording stays soft.
export function analyzeBills(bills) {
  const by = Object.fromEntries(bills.map((b) => [b.month, b]));
  const intensity = (b) => { const m = +b.month.slice(5) - 1; return b.kwh / (MONROE_NORMALS.hdd[m] + MONROE_NORMALS.cdd[m] + 150); };
  const ints = bills.map(intensity).sort((a, b) => a - b); const median = ints[Math.floor(ints.length / 2)] || 1;
  return [...bills].sort((a, b) => b.month.localeCompare(a.month)).map((b) => {
    const [y, m] = b.month.split('-'); const prev = by[`${+y - 1}-${m}`];
    const yoy = prev ? (b.kwh - prev.kwh) / prev.kwh : null; const ratio = intensity(b) / median;
    const flag = (yoy !== null && yoy > 0.2) || ratio > 1.35;
    const mi = +m - 1;
    return { ...b, prev, yoy, ratio, flag, hdd: MONROE_NORMALS.hdd[mi], cdd: MONROE_NORMALS.cdd[mi] };
  });
}
