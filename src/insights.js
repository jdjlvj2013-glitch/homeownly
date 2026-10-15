// Personal cost learning, call-helper symptoms and history insights.
// Everything here uses ONLY the user's own records — never compares companies.
import { MONTHS } from './logic.js';

export const VISIT_TYPES = { diagnostic: 'Service call', maintenance: 'Maintenance', repair: 'Repair' };
export const MIN_FOR_TYPICAL = 2; // need at least 2 paid visits before showing a "typical" cost
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// { [company]: { [type]: { costs, covered, count, ready, median, min, max } } }  ($0 visits counted as "covered")
export function costStats(services) {
  const out = {};
  for (const s of services) {
    const t = ((out[s.company] ||= {})[s.type] ||= { costs: [], covered: 0 });
    +s.cost > 0 ? t.costs.push(+s.cost) : t.covered++;
  }
  for (const c of Object.values(out)) for (const t of Object.values(c)) {
    t.count = t.costs.length; t.ready = t.count >= MIN_FOR_TYPICAL;
    if (t.count) { t.median = Math.round(median(t.costs)); t.min = Math.min(...t.costs); t.max = Math.max(...t.costs); }
  }
  return out;
}

// Symptoms. `safety` text => always "Call a tech now" / emergency, never any cost framing.
// `extreme` => becomes a safety case when it's freezing/extremely hot AND someone vulnerable is home.
// `water` => ask about the drain safety switch (it only stops the unit if one is installed).
export const SYMPTOMS = [
  { k: 'nocool', l: 'No cooling', i: '🥵', extreme: 'cool', water: true },
  { k: 'noheat', l: 'No heat', i: '🥶', extreme: 'heat' },
  { k: 'notrunning', l: 'Unit not running at all', i: '⏹️', water: true },
  { k: 'airflow', l: 'Weak airflow', i: '🌬️' },
  { k: 'noisy', l: 'Noisy / new sound', i: '🔊' },
  { k: 'shortcycle', l: 'Short cycling (on/off a lot)', i: '🔁' },
  { k: 'leak', l: 'Water leak', i: '💧', water: true },
  { k: 'ice', l: 'Ice or frost on lines/coil', i: '🧊' },
  { k: 'bill', l: 'Higher power bill', i: '⚡' },
  { k: 'burning', l: 'Burning or electrical smell', i: '🔥', safety: 'Turn the system off at the thermostat and call a tech now. If you see smoke or flames, leave and call 911.' },
  { k: 'smoke', l: 'Smoke from equipment or vents', i: '💨', safety: 'Leave the home and call 911. Then call your HVAC company.', emergency: true },
  { k: 'breaker', l: 'Breaker keeps tripping', i: '⚠️', safety: 'Do not keep resetting it. Leave it off and call a tech now.' },
  { k: 'gas', l: 'Gas smell (rotten eggs)', i: '⛽', safety: 'Leave the home now. Do not flip switches, use phones or start cars inside. From outside, call your gas company or 911.', emergency: true },
  { k: 'co', l: 'Carbon monoxide (CO) alarm', i: '🚨', safety: 'Get everyone outside to fresh air now and call 911 or your fire department.', emergency: true },
  { k: 'waterelec', l: 'Water near electrical / outlets', i: '🔌', safety: 'Stay clear of the water and anything electrical. Call a tech now.' },
];
export const symptom = (k) => SYMPTOMS.find((s) => s.k === k);

// Unlock: >= 3 records OR >= 6 months since the first record.
export function unlockStatus(services) {
  const n = services.length, first = services.map((s) => s.date).sort()[0];
  const months = first ? (Date.now() - new Date(first + 'T12:00')) / (30.44 * 864e5) : 0;
  return { unlocked: n >= 3 || months >= 6, n, months: Math.floor(months) };
}

const my = (d) => `${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const AIRFLOW_SYMPTOMS = ['nocool', 'airflow', 'leak', 'ice', 'shortcycle', 'bill', 'notrunning', 'noheat'];
export const PART_RULES = [
  { k: 'capacitor', re: /capacitor/i, title: 'Capacitor (a common repeat part)', sym: ['nocool', 'notrunning', 'noisy', 'shortcycle'] },
  { k: 'contactor', re: /contactor/i, title: 'Contactor', sym: ['nocool', 'notrunning', 'noisy'] },
  { k: 'drain', re: /drain|condensate|float switch/i, title: 'Condensate drain line', sym: ['leak', 'notrunning', 'nocool'] },
  { k: 'refrigerant', re: /refrigerant|leak search|leak check|recharge|freon|added r-?\d/i, title: 'Refrigerant level / possible leak', sym: ['nocool', 'ice', 'bill', 'shortcycle'] },
  { k: 'blower', re: /blower/i, title: 'Blower motor', sym: ['airflow', 'noisy', 'nocool', 'noheat'] },
  { k: 'igniter', re: /igniter|ignitor/i, title: 'Igniter', sym: ['noheat'] },
  { k: 'flame', re: /flame sensor/i, title: 'Flame sensor', sym: ['noheat', 'shortcycle'] },
];

// Returns 1-3 possibilities with evidence. Airflow is always ranked first when relevant.
export function historyInsights(services, eq, ageYears, sym, filterOverdueDays) {
  const recs = [...services].sort((a, b) => a.date.localeCompare(b.date)); const out = [];
  const air = recs.filter((s) => /\b(filter|coil|airflow|frozen|froze|ice|iced|icing)\b/i.test(s.work)).map((s) => `${s.work.toLowerCase()} (${my(s.date)})`);
  if (filterOverdueDays > 0) air.unshift(`filter change is ${filterOverdueDays} days overdue in your app`);
  if (air.length || AIRFLOW_SYMPTOMS.includes(sym)) out.push({ k: 'airflow', title: 'Airflow: filter, indoor coil or outdoor coil',
    why: 'Restricted airflow is one of the most common causes techs find.', evidence: air.length ? air.slice(0, 3) : ['no airflow-related work in your records yet — worth mentioning anyway'], score: 1000 });
  for (const r of PART_RULES) {
    const all = recs.filter((s) => r.re.test(s.work)); const hits = all.filter((s, i) => all.findIndex((x) => x.date === s.date) === i); if (!hits.length) continue;
    const summer = hits.filter((s) => [6, 7, 8].includes(+s.date.slice(5, 7))).length;
    const ev = [`${hits.length > 1 ? 'came up' : 'logged'} ${hits.map((s) => my(s.date)).join(' and ')}${hits.length > 1 ? ` (${hits.length} visits)` : ''}`];
    if (summer >= 2) ev.push('these happened in summer months, when the system works hardest');
    const match = r.sym.includes(sym);
    out.push({ k: r.k, title: r.title, why: hits.length > 1 ? 'This has come up more than once in your records.' : 'It is in your records.', evidence: ev,
      score: hits.length * 10 + (match ? 5 : 0) - (hits.length < 2 && !match ? 20 : 0) });
  }
  if (ageYears >= 12) out.push({ k: 'age', title: 'General wear with age', why: 'Older systems tend to need more parts over time.', evidence: [`your system is about ${Math.floor(ageYears)} years old`], score: 8 });
  return out.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}
