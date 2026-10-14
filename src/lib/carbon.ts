// Carbon math. Uses the widely-cited "1 byte transferred ≈ 0.00002g CO2e" figure
// (the "1byte" model from the Sustainable Web Design community / wholegrain digital).
// Data centers + networks + device usage folded into one coefficient.

// grams of CO2e per byte
export const GRAMS_PER_BYTE = 0.00002;

// grid intensity factor (world average ~ 519 gCO2/kWh). We keep the byte model
// since it already bakes in typical grid mix; exposed for display only.
export const GRID_INTENSITY = 519;

export function bytesToGrams(bytes: number): number {
  return bytes * GRAMS_PER_BYTE;
}

export function gramsToKg(g: number): number {
  return g / 1000;
}

// human friendly formatting
export function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
  if (g >= 1) return `${g.toFixed(1)} g`;
  return `${(g * 1000).toFixed(0)} mg`;
}

export function formatGramsShort(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)}kg`;
  if (g >= 1) return `${g.toFixed(0)}g`;
  return `${(g * 1000).toFixed(0)}mg`;
}

// tangible equivalents (rough)
export function gramsToEquivalent(g: number): { value: string; label: string } {
  // 1 km of driving ≈ 170g CO2 (average car)
  const meters = (g / 170) * 1000;
  if (meters >= 1000) return { value: `${(meters / 1000).toFixed(2)} km`, label: 'driving' };
  return { value: `${meters.toFixed(0)} m`, label: 'driving' };
}

export function getDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function getWeekKey(d: Date = new Date()): string {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  const day = tmp.getDay() || 7; // make Sunday = 7
  const monday = new Date(tmp);
  monday.setDate(tmp.getDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}
