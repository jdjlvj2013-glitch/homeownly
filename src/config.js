// ===== Single place to rename / reconfigure the app =====
export const APP_NAME = 'HomeOwnly';
export const PRICING = { monthly: 4.99, yearly: 39, trialDays: 60 };
// Filter affiliate URL builder. Placeholders: {size} e.g. 16x25x1, {w},{h},{d}, {ref}
export const FILTER_PARTNER = {
  name: 'Example Filter Co. (placeholder)',
  urlPattern: 'https://example-filters.com/search?size={size}&ref={ref}',
  affiliateRef: 'HOMEOWNLY-DEMO',
};
// Customer referral codes (from a tech). Format like the existing tech codes, e.g. JSIMS-WM.
// A valid code gives 50% off the FIRST MONTH of the monthly plan only (not the yearly plan).
// No payments yet: we only store the flag on the account (plan.referralDiscount).
// TODO(Stripe): apply plan.referralDiscount as a one-time 50%-off coupon on the first monthly invoice.
export const REFERRAL = { discountPct: 50, appliesTo: 'monthly_first_month', codeRe: /^[A-Z0-9]{2,12}-[A-Z0-9]{2,6}$/ };
// Equipment categories. HVAC is the first; add plumbing, water heater, roof, appliances later.
export const CATEGORIES = {
  hvac: { label: 'Heating & Cooling', icon: '❄️', enabled: true },
  water_heater: { label: 'Water Heater', icon: '🔥', enabled: false },
  plumbing: { label: 'Plumbing', icon: '🚰', enabled: false },
  roof: { label: 'Roof', icon: '🏠', enabled: false },
  appliance: { label: 'Appliances', icon: '🧺', enabled: false },
};
// Supabase (client-safe publishable key; access is enforced by row level security — see supabase/setup.sql)
export const SUPABASE = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://rmmkvekvwhpklqtgxffe.supabase.co',
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Ri2He1kbylkUjZB-KlteQA_gbHdhVkK',
};
