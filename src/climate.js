// Approximate monthly heating/cooling degree-day normals (base 65°F) for Monroe, LA.
// Basis: NOAA NCEI U.S. Climate Normals 1991–2020, Monroe Regional Airport (GHCND USW00013942)
// https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals
// Values are ROUNDED APPROXIMATIONS for the prototype — replace with exact NOAA values (or Open-Meteo history) before launch.
export const MONROE_NORMALS = {
  hdd: [560, 410, 250, 90, 15, 0, 0, 0, 5, 75, 270, 500],
  cdd: [10, 15, 50, 140, 330, 480, 565, 555, 405, 170, 40, 10],
};
