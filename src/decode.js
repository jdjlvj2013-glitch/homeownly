// Nameplate decoding — ALL RESULTS ARE ESTIMATES. Joshua (tech) to verify.
// Sources (public, retrieved 2026-10-12):
//  [S1] https://mytidyboss.com/tools/hvac-age/  (Goodman/Carrier/Lennox/Trane/York rules)
//  [S2] https://www.intrysys.com/tools/hvac/serial-number-lookup  (Carrier WWYY, Goodman YYMM, Rheem letter+week/year)
//  [S3] https://howoldismyunit.com/llms.txt  (worked examples per brand/era, incl. Rheem W291013412, York W0K5896070)
// Only formats with a published rule + worked example are implemented. Anything else => "can't decode, check plate".

const NOW = new Date();
const yy2 = (n) => { const y = 2000 + n; return y > NOW.getFullYear() + 1 ? 1900 + n : y; };
const weekToMonth = (w) => Math.min(12, Math.max(1, Math.ceil(w / 4.35)));
const ok = (year, month, rule, source) => ({ ok: true, year, month, rule, source });

export const BRANDS = [
  { id: 'carrier', label: 'Carrier / Bryant / Payne' },
  { id: 'trane', label: 'Trane / American Standard' },
  { id: 'lennox', label: 'Lennox' },
  { id: 'goodman', label: 'Goodman / Amana' },
  { id: 'rheem', label: 'Rheem / Ruud' },
  { id: 'york', label: 'York / Luxaire / Coleman' },
  { id: 'other', label: 'Other / not sure' },
];

const DECODERS = {
  // Carrier/Bryant/Payne 1980+: first 4 digits WWYY (week, year). e.g. 4006A17330 = wk 40 of 2006 [S2][S3]
  carrier(s) {
    const m = s.match(/^(\d{2})(\d{2})[A-Z]/);
    if (!m) return null; const w = +m[1]; if (w < 1 || w > 53) return null;
    return ok(yy2(+m[2]), weekToMonth(w), `Digits 1–2 = week ${w}, digits 3–4 = year`, 'S2,S3');
  },
  // Trane/American Standard: 2010+ = YYWW (130313596L = wk 3 of 2013); 2002–2009 = YWW (91531S41F = wk 15 of 2009) [S1][S3]
  trane(s) {
    let m = s.match(/^(\d{2})(\d{2})\d/);
    if (m && s.length >= 10 && +m[1] >= 10 && +m[2] >= 1 && +m[2] <= 53)
      return ok(2000 + +m[1], weekToMonth(+m[2]), `2010+ format: digits 1–2 = year, 3–4 = week ${+m[2]}`, 'S1,S3');
    m = s.match(/^(\d)(\d{2})/);
    if (m && s.length === 9 && +m[2] >= 1 && +m[2] <= 53)
      return ok(2000 + +m[1], weekToMonth(+m[2]), `2002–09 format: digit 1 = year, 2–3 = week ${+m[2]}`, 'S1,S3');
    return null; // pre-2002 letter-year codes not implemented
  },
  // Lennox: digits 1–2 plant, 3–4 year, char 5 month letter A–M skipping I. 5899L17212 = Nov 1999 [S1][S3]
  lennox(s) {
    const m = s.match(/^\d{2}(\d{2})([A-HJ-M])/);
    if (!m) return null; const month = 'ABCDEFGHJKLM'.indexOf(m[2]) + 1;
    return ok(yy2(+m[1]), month, `Digits 3–4 = year, letter "${m[2]}" = month`, 'S1,S3');
  },
  // Goodman/Amana: 10-digit serial, first 4 = YYMM. 9704011000 = Apr 1997 [S1][S2]
  goodman(s) {
    const m = s.match(/^(\d{2})(\d{2})\d{6,}$/);
    if (!m || +m[2] < 1 || +m[2] > 12) return null;
    return ok(yy2(+m[1]), +m[2], 'Digits 1–2 = year, 3–4 = month', 'S1,S2');
  },
  // Rheem/Ruud: leading letter, then WWYY. W291013412 = wk 29 of 2010 [S2][S3]
  rheem(s) {
    const m = s.match(/^[A-Z](\d{2})(\d{2})\d/);
    if (!m || +m[1] < 1 || +m[1] > 53) return null;
    return ok(yy2(+m[2]), weekToMonth(+m[1]), `After the letter: week ${+m[1]}, then year`, 'S2,S3');
  },
  // York/Luxaire/Coleman 2004+: chars 2 & 4 = year digits, char 3 = month letter (A–N skipping I,J). W0K5896070 = Sep 2005 [S1][S3]
  york(s) {
    const m = s.match(/^[A-Z](\d)([A-HK-N])(\d)/);
    if (!m) return null; const month = 'ABCDEFGHKLMN'.indexOf(m[2]) + 1;
    const year = 2000 + +(m[1] + m[3]); if (year < 2004) return null;
    return ok(year, month, `Chars 2 & 4 = year, letter "${m[2]}" = month`, 'S1,S3');
  },
};

export function decodeSerial(brand, serial) {
  const s = (serial || '').toUpperCase().replace(/[\s-]/g, '');
  const fn = DECODERS[brand];
  const r = fn && s ? fn(s) : null;
  if (!r || r.year > NOW.getFullYear() || r.year < 1970)
    return { ok: false, message: 'We couldn’t read a date from this serial. Many plates also print a “Mfg date” — your tech can confirm.' };
  const ageYears = Math.max(0, (NOW - new Date(r.year, r.month - 1, 15)) / 3.156e10);
  return { ...r, ageYears: Math.round(ageYears * 10) / 10 };
}

// Tonnage from model number: most residential models embed nominal capacity in kBtu/h
// (18,24,30,36,42,48,60 => 1.5–5 tons; 12,000 Btu/h = 1 ton). Heuristic — estimate only.
export function decodeTonnage(model) {
  const m = (model || '').toUpperCase();
  // Skip position 0 (often a series code, e.g. Carrier "24ACC636" -> 36 = 3 ton). Prefer 3-digit 0XX codes (Goodman "GSX140241" -> 024).
  const three = [...m.matchAll(/0(18|24|30|36|42|48|60)/g)].filter((x) => x.index > 0);
  const two = [...m.matchAll(/(18|24|30|36|42|48|60)/g)].filter((x) => x.index > 0);
  const hit = three[0] || two[two.length - 1];
  if (!hit) return null;
  const kbtu = parseInt(hit[1], 10);
  const hits = [[hit[0]]];
  return { tons: kbtu / 12, kbtu, note: `“${hit[0]}” in model ≈ ${kbtu},000 Btu/h` };
}

// Refrigerant estimate by build year (US EPA phase-outs: R-22 not allowed in new systems from 2010;
// AIM Act transition to low-GWP (R-454B / R-32) for new residential split systems from 2025).
// Source: https://www.epa.gov/section608/phaseout-ozone-depleting-substances ; https://www.epa.gov/climate-hfcs-reduction/technology-transitions
export function estimateRefrigerant(year) {
  if (!year) return 'Check nameplate';
  if (year < 2010) return 'Likely R-22 (check plate)';
  if (year < 2025) return 'Likely R-410A (check plate)';
  return 'Likely R-454B or R-32 (check plate)';
}
