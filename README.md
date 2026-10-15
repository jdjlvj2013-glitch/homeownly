# HomeKeep (working name) — clickable prototype
Rename: edit `APP_NAME` in `src/config.js` (also `index.html` <title> and `public/manifest.webmanifest`).
- `npm install && npm run dev` → http://localhost:5173  (mobile: open the Network URL on a phone on the same Wi-Fi)
- `npm run build` → static site in `dist/` (`npm run preview` to serve it)
- `npm run shots` → 390x844 screenshots into `screenshots/` (needs dev server running)
Key files: config.js (name, pricing, filter partner URL pattern, categories, referral), decode.js (serial/tonnage/refrigerant rules + sources),
climate.js (Monroe degree-day normals), logic.js (trial, bill check), storage.js (swap localStorage → Supabase), seed.js (EXAMPLE data).
Data model: homes[] → equipment[] {category:'hvac', …} → services[] {equipmentId}. Add categories in config.CATEGORIES.
