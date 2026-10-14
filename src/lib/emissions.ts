// Manual-entry emission factors (grams CO2e per unit).
// Sources: widely-cited averages (BEIS/DEFRA, EPA, IPCC).
// These are estimates; location-adjusted energy entries multiply by a local grid factor.

export type CategoryId = 'transport' | 'food' | 'energy' | 'shopping' | 'other';

export interface ActivityOption {
  id: string;
  label: string;
  unit: string; // display unit for quantity
  perUnit: number; // grams CO2e per 1 unit
  // if energyCategory is set, the grams are multiplied by (gridFactor / WORLD_GRID)
  energyCategory?: boolean;
}

export const CATEGORY_META: Record<CategoryId, { label: string; icon: string; color: string }> = {
  transport: { label: 'Transport', icon: 'Car', color: '#60a5fa' },
  food: { label: 'Food', icon: 'UtensilsCrossed', color: '#f59e0b' },
  energy: { label: 'Energy', icon: 'Zap', color: '#fbbf24' },
  shopping: { label: 'Shopping', icon: 'ShoppingBag', color: '#f472b6' },
  other: { label: 'Other', icon: 'CircleDot', color: '#94a3b8' },
};

export const ACTIVITIES: Record<CategoryId, ActivityOption[]> = {
  transport: [
    { id: 'car_petrol', label: 'Car (petrol)', unit: 'km', perUnit: 192 },
    { id: 'car_diesel', label: 'Car (diesel)', unit: 'km', perUnit: 171 },
    { id: 'car_electric', label: 'Car (electric)', unit: 'km', perUnit: 53 },
    { id: 'bus', label: 'Bus', unit: 'km', perUnit: 105 },
    { id: 'train', label: 'Train', unit: 'km', perUnit: 41 },
    { id: 'flight_short', label: 'Flight (short-haul)', unit: 'km', perUnit: 156 },
    { id: 'flight_long', label: 'Flight (long-haul)', unit: 'km', perUnit: 195 },
    { id: 'bike', label: 'Bicycle', unit: 'km', perUnit: 0 },
    { id: 'walk', label: 'Walking', unit: 'km', perUnit: 0 },
  ],
  food: [
    { id: 'beef', label: 'Beef meal', unit: 'serving', perUnit: 6700 },
    { id: 'lamb', label: 'Lamb meal', unit: 'serving', perUnit: 3900 },
    { id: 'cheese', label: 'Cheese', unit: '100g', perUnit: 2100 },
    { id: 'chicken', label: 'Chicken meal', unit: 'serving', perUnit: 1500 },
    { id: 'fish', label: 'Fish meal', unit: 'serving', perUnit: 1100 },
    { id: 'vegetarian', label: 'Vegetarian meal', unit: 'serving', perUnit: 700 },
    { id: 'vegan', label: 'Vegan meal', unit: 'serving', perUnit: 400 },
    { id: 'coffee', label: 'Coffee', unit: 'cup', perUnit: 280 },
  ],
  energy: [
    { id: 'electricity', label: 'Electricity', unit: 'kWh', perUnit: 475, energyCategory: true },
    { id: 'gas', label: 'Natural gas', unit: 'kWh', perUnit: 184 },
    { id: 'heating_oil', label: 'Heating oil', unit: 'litre', perUnit: 2300 },
    { id: 'laundry', label: 'Laundry wash', unit: 'wash', perUnit: 600 },
    { id: 'stream_1h', label: 'Video streaming', unit: 'hour', perUnit: 36 },
  ],
  shopping: [
    { id: 'clothing', label: 'Clothing item', unit: 'item', perUnit: 10000 },
    { id: 'electronics', label: 'Electronics', unit: 'item', perUnit: 200000 },
    { id: 'furniture', label: 'Furniture', unit: 'item', perUnit: 80000 },
    { id: 'books', label: 'Book', unit: 'book', perUnit: 1000 },
  ],
  other: [
    { id: 'custom', label: 'Custom', unit: 'unit', perUnit: 0 },
  ],
};

// World average grid intensity ~ 475 gCO2/kWh (IEA).
export const WORLD_GRID = 475;

// A small built-in set of regional grid factors for location-based accuracy.
export const GRID_FACTORS: Record<string, number> = {
  'World average': 475,
  'United States': 379,
  'European Union': 227,
  'United Kingdom': 182,
  'France': 56,
  'Germany': 338,
  'China': 530,
  'India': 632,
  'Australia': 666,
  'Canada': 149,
  'Brazil': 98,
  'Japan': 486,
  'Nordics': 50,
};

export function computeGrams(
  activity: ActivityOption,
  quantity: number,
  gridFactor: number | null,
): { grams: number; accuracy: 'estimated' | 'location-adjusted' } {
  if (activity.energyCategory && gridFactor) {
    const adjusted = activity.perUnit * (gridFactor / WORLD_GRID) * quantity;
    return { grams: Math.round(adjusted), accuracy: 'location-adjusted' };
  }
  return { grams: Math.round(activity.perUnit * quantity), accuracy: 'estimated' };
}
