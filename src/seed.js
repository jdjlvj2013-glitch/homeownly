// EXAMPLE DEMO DATA — clearly fake; loaded on first run or via Settings > "Reset demo data".
const id = () => Math.random().toString(36).slice(2, 9);
export const uid = id;
function bills() {
  // kWh roughly following Monroe degree days; Aug 2026 intentionally high to show a flag.
  const base2025 = [1180, 980, 820, 900, 1350, 1750, 1980, 2010, 1620, 1050, 890, 1120];
  const out = [];
  base2025.forEach((k, i) => out.push({ id: id(), month: `2025-${String(i + 1).padStart(2, '0')}`, kwh: k, dollars: +(k * 0.118).toFixed(2) }));
  const y26 = [1210, 1000, 800, 930, 1390, 1800, 2050, 2690, 1700];
  y26.forEach((k, i) => out.push({ id: id(), month: `2026-${String(i + 1).padStart(2, '0')}`, kwh: k, dollars: +(k * 0.121).toFixed(2) }));
  return out;
}
export function makeSeed() {
  const homeId = 'home1', sys1 = 'sys1', sys2 = 'sys2';
  return {
    demo: true,
    user: { name: 'Example Homeowner', email: 'demo@example.com', referredBy: 'JSIMS-WM', signedUp: true },
    plan: { subscribed: false, trialStart: null, interval: null },
    techReferralCodes: [{ code: 'JSIMS-WM', techName: 'Joshua Sims (West Monroe, LA)' }],
    homes: [{ id: homeId, name: 'Example Home — 123 Demo St, West Monroe' }],
    activeEquipmentId: sys1,
    equipment: [
      { id: sys1, homeId, category: 'hvac', name: 'Main house (EXAMPLE)', brand: 'carrier', model: '24ACC636A003', serial: '1214E12345',
        installDate: '2014-06-10', filterSize: '16x25x1', filterMonths: 3, lastFilterChange: '2026-07-20',
        warranty: { endDate: '2026-12-31', registered: false, notes: '10-yr parts if registered (verify with installer)' } },
      { id: sys2, homeId, category: 'hvac', name: 'Upstairs (EXAMPLE)', brand: 'goodman', model: 'GSX140241', serial: '1906123456',
        installDate: '2019-08-02', filterSize: '20x20x1', filterMonths: 2, lastFilterChange: '2026-09-01',
        warranty: { endDate: '2029-08-02', registered: true, notes: '' } },
    ],
    services: [
      // Example HVAC Co. (agreement provider) — repeated summer capacitor replacements
      { id: id(), equipmentId: sys1, date: '2026-04-14', company: 'Example HVAC Co.', work: 'Spring tune-up, cleaned condenser coil', cost: 0, type: 'maintenance' },
      { id: id(), equipmentId: sys1, date: '2025-10-20', company: 'Example HVAC Co.', work: 'Fall heating check', cost: 0, type: 'maintenance' },
      { id: id(), equipmentId: sys1, date: '2025-06-18', company: 'Example HVAC Co.', work: 'Service call — no cooling', cost: 95, type: 'diagnostic' },
      { id: id(), equipmentId: sys1, date: '2025-06-18', company: 'Example HVAC Co.', work: 'Replaced run capacitor', cost: 185, type: 'repair' },
      { id: id(), equipmentId: sys1, date: '2024-07-09', company: 'Example HVAC Co.', work: 'Service call — outdoor fan not spinning', cost: 89, type: 'diagnostic' },
      { id: id(), equipmentId: sys1, date: '2024-07-09', company: 'Example HVAC Co.', work: 'Replaced dual run capacitor', cost: 175, type: 'repair' },
      { id: id(), equipmentId: sys1, date: '2024-04-02', company: 'Example HVAC Co.', work: 'Spring tune-up', cost: 99, type: 'maintenance' },
      { id: id(), equipmentId: sys1, date: '2025-03-28', company: 'Example HVAC Co.', work: 'Spring tune-up', cost: 99, type: 'maintenance' },
      // Sample Air & Heat (EXAMPLE) — airflow & drain history
      { id: id(), equipmentId: sys1, date: '2023-08-14', company: 'Sample Air & Heat', work: 'Service call — weak airflow, indoor coil frozen', cost: 120, type: 'diagnostic' },
      { id: id(), equipmentId: sys1, date: '2023-08-14', company: 'Sample Air & Heat', work: 'Cleaned dirty indoor coil, new filter', cost: 240, type: 'repair' },
      { id: id(), equipmentId: sys1, date: '2024-01-09', company: 'Sample Air & Heat', work: 'Service call — no heat', cost: 110, type: 'diagnostic' },
      { id: id(), equipmentId: sys1, date: '2024-01-09', company: 'Sample Air & Heat', work: 'Replaced hot surface igniter', cost: 210, type: 'repair' },
      { id: id(), equipmentId: sys1, date: '2024-08-21', company: 'Sample Air & Heat', work: 'Cleared condensate drain line', cost: 129, type: 'repair' },
      // Demo Comfort Pros — only one visit (not enough for a typical cost)
      { id: id(), equipmentId: sys1, date: '2026-07-30', company: 'Demo Comfort Pros', work: 'Service call — water at indoor unit, drain clog', cost: 105, type: 'diagnostic' },
      { id: id(), equipmentId: sys1, date: '2026-07-30', company: 'Demo Comfort Pros', work: 'Cleared clogged condensate drain line', cost: 140, type: 'repair' },
      { id: id(), equipmentId: sys2, date: '2026-05-02', company: 'Example HVAC Co.', work: 'Spring tune-up', cost: 0, type: 'maintenance' },
    ],
    agreement: { provider: 'Example HVAC Co.', start: '2026-01-15', visitsIncluded: 2, visitsUsed: 1,
      perks: ['No overtime charges', 'Priority scheduling', '15% off repairs'], price: 179 },
    preferredCompany: { name: 'Example HVAC Co.', phone: '555-0100' },
    bills: bills(),
  };
}

// Blank account: one empty home + one empty system so every screen has something to attach to.
export function makeEmpty() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    demo: false,
    user: { name: '', email: '', referredBy: '', signedUp: false },
    plan: { subscribed: false, trialStart: null, interval: null },
    techReferralCodes: [{ code: 'JSIMS-WM', techName: 'Joshua Sims (West Monroe, LA)' }],
    homes: [{ id: 'home1', name: 'My Home' }],
    activeEquipmentId: 'sys1',
    equipment: [{ id: 'sys1', homeId: 'home1', category: 'hvac', name: 'My system', brand: 'other', model: '', serial: '', installDate: '',
      filterSize: '16x25x1', filterMonths: 3, lastFilterChange: today, warranty: { endDate: '', registered: false, notes: '' } }],
    services: [], agreement: null, preferredCompany: null, bills: [],
  };
}
