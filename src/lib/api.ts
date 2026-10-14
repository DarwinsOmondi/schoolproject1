// Free, no-key-required APIs:
//  - OSRM (Open Source Routing Machine) public demo server for driving/walking/cycling distances
//  - OpenStreetMap Nominatim for geocoding place names into coordinates
//  - Open Food Facts for food product carbon footprint lookups

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
}

export interface GeoPlace {
  displayName: string;
  lat: number;
  lon: number;
}

// Geocode a place name into lat/lon using Nominatim (free, no key).
export async function geocode(query: string): Promise<GeoPlace[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return data.map((d) => ({
    displayName: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
  }));
}

// Route between two coordinates using OSRM public demo server (free, no key).
// profile: 'driving' | 'walking' | 'cycling'
export async function getRoute(
  start: GeoPlace,
  end: GeoPlace,
  profile: 'driving' | 'walking' | 'cycling' = 'driving',
): Promise<RouteResult> {
  const url = `https://router.project-osrm.net/route/v1/${profile}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between these locations');
  }
  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

// Emission factors per passenger-km (grams CO2e), used with real route distance.
export const TRANSPORT_FACTORS: Record<string, { label: string; perKm: number; osrmProfile: 'driving' | 'walking' | 'cycling' | null }> = {
  car_petrol: { label: 'Car (petrol)', perKm: 192, osrmProfile: 'driving' },
  car_diesel: { label: 'Car (diesel)', perKm: 171, osrmProfile: 'driving' },
  car_electric: { label: 'Car (electric)', perKm: 53, osrmProfile: 'driving' },
  car_hybrid: { label: 'Car (hybrid)', perKm: 112, osrmProfile: 'driving' },
  bus: { label: 'Bus', perKm: 105, osrmProfile: 'driving' },
  motorbike: { label: 'Motorbike', perKm: 103, osrmProfile: 'driving' },
  bicycle: { label: 'Bicycle', perKm: 0, osrmProfile: 'cycling' },
  walking: { label: 'Walking', perKm: 0, osrmProfile: 'walking' },
};

// For modes without OSRM routing (train, flight), use manual distance entry.
export const MANUAL_DISTANCE_MODES: Record<string, { label: string; perKm: number }> = {
  train: { label: 'Train', perKm: 41 },
  flight_short: { label: 'Flight (short-haul)', perKm: 156 },
  flight_long: { label: 'Flight (long-haul)', perKm: 195 },
  tram: { label: 'Tram / Metro', perKm: 30 },
};

export interface FoodResult {
  productName: string;
  grams: number;
  source: string;
  imageUrl?: string;
}

// Search Open Food Facts for a product and estimate its carbon footprint.
// Tries the V2 search API first (more reliable), falls back to the legacy endpoint.
export async function searchFood(query: string): Promise<FoodResult[]> {
  const fields = 'product_name,carbon_footprint_from_meat_or_fish,carbon_footprint_from_known_ingredients,image_front_small_url,serving_quantity,categories,ecoscore_grade';

  type OFFProduct = {
    product_name?: string;
    carbon_footprint_from_meat_or_fish?: number;
    carbon_footprint_from_known_ingredients?: number;
    image_front_small_url?: string;
    serving_quantity?: number;
    categories?: string;
    ecoscore_grade?: string;
  };

  let products: OFFProduct[] = [];

  try {
    const v2Url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=8&fields=${fields}`;
    const res = await fetch(v2Url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      products = data.products ?? [];
    }
  } catch {
    // V2 failed, try legacy
  }

  if (products.length === 0) {
    const v1Url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`;
    const res = await fetch(v1Url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Food search failed (${res.status})`);
    const data = await res.json();
    products = data.products ?? [];
  }

  const results: FoodResult[] = [];
  for (const p of products) {
    const name = p.product_name || query;
    let grams = 0;
    let source = '';

    if (p.carbon_footprint_from_meat_or_fish != null) {
      grams = Math.round(p.carbon_footprint_from_meat_or_fish);
      source = 'Open Food Facts (meat/fish)';
    } else if (p.carbon_footprint_from_known_ingredients != null) {
      grams = Math.round(p.carbon_footprint_from_known_ingredients);
      source = 'Open Food Facts (ingredients)';
    } else {
      grams = estimateFromEcoScore(p.ecoscore_grade, p.categories || '', p.serving_quantity);
      source = 'Estimated from eco-score';
    }

    if (grams > 0) {
      results.push({
        productName: name,
        grams,
        source,
        imageUrl: p.image_front_small_url,
      });
    }
  }

  return results;
}

function estimateFromEcoScore(grade: string | undefined, categories: string, servingGrams: number | undefined): number {
  const serving = servingGrams ?? 100; // assume 100g if unknown
  // Base CO2e per 100g by eco-score grade (rough averages from Agribalyse data)
  const gradeFactors: Record<string, number> = {
    a: 200,
    b: 450,
    c: 800,
    d: 1400,
    e: 2500,
  };
  const base = gradeFactors[grade?.toLowerCase() ?? 'c'] ?? 800;
  // Check if it's a meat/fish product
  const cat = categories.toLowerCase();
  if (cat.includes('meat') || cat.includes('beef') || cat.includes('fish')) {
    return Math.round((base * 3 * serving) / 100);
  }
  return Math.round((base * serving) / 100);
}
