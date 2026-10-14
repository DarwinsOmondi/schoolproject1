import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Plus, Trash2, MapPin, Loader2, ChevronDown, Search, Navigation, UtensilsCrossed, Car, Zap, ShoppingBag, CircleDot } from 'lucide-react';
import type { CategoryId, ActivityOption } from '@/lib/emissions';
import {
  CATEGORY_META,
  ACTIVITIES,
  GRID_FACTORS,
  WORLD_GRID,
  computeGrams,
} from '@/lib/emissions';
import {
  TRANSPORT_FACTORS,
  MANUAL_DISTANCE_MODES,
  geocode,
  getRoute,
  searchFood,
  type GeoPlace,
  type FoodResult,
} from '@/lib/api';
import { formatGrams } from '@/lib/carbon';
import type { ManualEntry } from '@/lib/entries';
import { fetchEntries, insertEntry, deleteEntry } from '@/lib/entries';
import type { Profile } from '@/lib/useAuth';

interface Props {
  profile: Profile | null;
  onProfileChange: (updates: Partial<Profile>) => Promise<void>;
}

export function LogTab({ profile, onProfileChange }: Props) {
  const [category, setCategory] = useState<CategoryId>('transport');
  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCategoryChange = (cat: CategoryId) => setCategory(cat);

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleLocation = async (loc: string) => {
    const factor = GRID_FACTORS[loc] ?? WORLD_GRID;
    await onProfileChange({ location: loc, grid_factor: factor });
    setLocOpen(false);
  };

  const addEntry = async (entry: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>) => {
    setSaving(true);
    setError(null);
    try {
      const created = await insertEntry(entry);
      setEntries((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const todayGrams = entries
    .filter((e) => new Date(e.logged_at).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + Number(e.grams), 0);
  const totalGrams = entries.reduce((s, e) => s + Number(e.grams), 0);

  return (
    <div className="px-4 py-3 space-y-4 animate-fade-up">
      {/* Location card */}
      <div className="rounded-xl glass p-3">
        <button
          onClick={() => setLocOpen(!locOpen)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-accent" />
            <span className="text-xs font-semibold text-primary">Location accuracy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-secondary">
              {profile?.location ?? 'World average'}
            </span>
            <ChevronDown size={13} className={`text-muted transition-transform ${locOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {locOpen && (
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 animate-fade-up">
            {Object.keys(GRID_FACTORS).map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocation(loc)}
                className={`text-[11px] py-1.5 px-2 rounded-lg border transition-colors ${
                  profile?.location === loc
                    ? 'bg-accent-light border-accent/40 text-accent-text'
                    : 'bg-elevated border-subtle text-secondary hover:bg-input'
                }`}
              >
                {loc}
                <span className="block text-[9px] text-muted">{GRID_FACTORS[loc]} g/kWh</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(CATEGORY_META) as CategoryId[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = (LucideIcons as any)[meta.icon] || CircleDot;
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-accent-light text-accent-text border border-accent/30'
                  : 'bg-elevated text-muted border border-subtle hover:bg-input'
              }`}
            >
              <Icon size={12} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Category-specific calculator */}
      {category === 'transport' && (
        <TransportCalculator saving={saving} onAdd={addEntry} location={profile?.location ?? null} />
      )}
      {category === 'food' && (
        <FoodCalculator saving={saving} onAdd={addEntry} location={profile?.location ?? null} />
      )}
      {category === 'energy' && (
        <EnergyCalculator saving={saving} onAdd={addEntry} gridFactor={profile?.grid_factor ?? null} location={profile?.location ?? null} />
      )}
      {category === 'shopping' && (
        <SimpleCalculator
          category="shopping"
          activities={ACTIVITIES.shopping}
          saving={saving}
          onAdd={addEntry}
          location={profile?.location ?? null}
        />
      )}
      {category === 'other' && (
        <SimpleCalculator
          category="other"
          activities={ACTIVITIES.other}
          saving={saving}
          onAdd={addEntry}
          location={profile?.location ?? null}
        />
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl glass p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Today</p>
          <p className="text-base font-bold text-primary">{formatGrams(todayGrams)}</p>
        </div>
        <div className="rounded-xl glass p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Total logged</p>
          <p className="text-base font-bold text-primary">{formatGrams(totalGrams)}</p>
        </div>
      </div>

      {/* Entry list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-secondary">Recent entries</span>
          <span className="text-[10px] text-muted">{entries.length} total</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-muted" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">
            No manual entries yet. Use the calculator above to log an activity.
          </p>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 20).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg glass px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary truncate">{e.activity}</p>
                  <p className="text-[10px] text-muted">
                    {e.detail}
                    {e.location && ` · ${e.location}`}
                    {e.accuracy === 'location-adjusted' && ' · adjusted'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-primary tabular-nums">{formatGrams(Number(e.grams))}</span>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Transport: real route distances via OSRM + Nominatim ---
function TransportCalculator({
  saving,
  onAdd,
  location,
}: {
  saving: boolean;
  onAdd: (e: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>) => Promise<void>;
  location: string | null;
}) {
  const [mode, setMode] = useState<string>('car_petrol');
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromResults, setFromResults] = useState<GeoPlace[]>([]);
  const [toResults, setToResults] = useState<GeoPlace[]>([]);
  const [fromPlace, setFromPlace] = useState<GeoPlace | null>(null);
  const [toPlace, setToPlace] = useState<GeoPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualDist, setManualDist] = useState('');
  const [useManualDist, setUseManualDist] = useState(false);

  const isRoutedMode = TRANSPORT_FACTORS[mode]?.osrmProfile != null;
  const factor = isRoutedMode
    ? TRANSPORT_FACTORS[mode]
    : MANUAL_DISTANCE_MODES[mode] ?? MANUAL_DISTANCE_MODES.train;
  const effectiveDist = route ? route.distanceKm : parseFloat(manualDist) || 0;
  const grams = factor ? Math.round(factor.perKm * effectiveDist) : 0;

  const searchFrom = async () => {
    if (fromQuery.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const results = await geocode(fromQuery);
      setFromResults(results);
      if (results.length === 0) setError('No places found for "from"');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const searchTo = async () => {
    if (toQuery.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const results = await geocode(toQuery);
      setToResults(results);
      if (results.length === 0) setError('No places found for "to"');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const calculateRoute = async () => {
    if (!fromPlace || !toPlace) {
      setError('Select both a start and end location');
      return;
    }
    setRouting(true);
    setError(null);
    try {
      const profile = TRANSPORT_FACTORS[mode]?.osrmProfile ?? 'driving';
      const result = await getRoute(fromPlace, toPlace, profile);
      setRoute(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed');
    } finally {
      setRouting(false);
    }
  };

  const handleAdd = async () => {
    if (grams <= 0) return;
    const detail = route
      ? `${route.distanceKm.toFixed(1)} km · ${Math.round(route.durationMin)} min`
      : `${effectiveDist.toFixed(1)} km`;
    await onAdd({
      category: 'transport',
      activity: factor?.label ?? 'Transport',
      detail,
      grams,
      accuracy: route ? 'location-adjusted' : 'estimated',
      grid_factor: null,
      location,
    });
    setRoute(null);
    setManualDist('');
  };

  return (
    <div className="rounded-xl glass p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        <Navigation size={13} className="text-blue-500" />
        <span>Real route distance via OpenStreetMap</span>
      </div>

      {/* Mode select */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">Vehicle</label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setRoute(null);
            setUseManualDist(false);
            setManualDist('');
          }}
          className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
        >
          {Object.entries(TRANSPORT_FACTORS).map(([id, m]) => (
            <option key={id} value={id}>{m.label}</option>
          ))}
          {Object.entries(MANUAL_DISTANCE_MODES).map(([id, m]) => (
            <option key={id} value={id}>{m.label} (enter distance)</option>
          ))}
        </select>
      </div>

      {isRoutedMode && !useManualDist ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted">Route</span>
            <button
              onClick={() => { setUseManualDist(true); setRoute(null); }}
              className="text-[10px] text-accent hover:opacity-80 transition-opacity"
            >
              Enter distance instead
            </button>
          </div>
          {/* From */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">From</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchFrom()}
                placeholder="Enter a place or address"
                className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={searchFrom}
                disabled={searching}
                className="px-3 rounded-lg glass text-secondary hover:bg-input transition-colors"
              >
                <Search size={14} />
              </button>
            </div>
            {fromResults.length > 0 && !fromPlace && (
              <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                {fromResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setFromPlace(r); setFromResults([]); setFromQuery(r.displayName.split(',')[0]); }}
                    className="block w-full text-left text-[11px] text-secondary hover:text-accent truncate py-1 px-2 rounded hover:bg-elevated"
                  >
                    {r.displayName}
                  </button>
                ))}
              </div>
            )}
            {fromPlace && (
              <p className="text-[10px] text-accent mt-1 truncate">✓ {fromPlace.displayName}</p>
            )}
          </div>

          {/* To */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">To</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchTo()}
                placeholder="Enter a destination"
                className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={searchTo}
                disabled={searching}
                className="px-3 rounded-lg glass text-secondary hover:bg-input transition-colors"
              >
                <Search size={14} />
              </button>
            </div>
            {toResults.length > 0 && !toPlace && (
              <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                {toResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setToPlace(r); setToResults([]); setToQuery(r.displayName.split(',')[0]); }}
                    className="block w-full text-left text-[11px] text-secondary hover:text-accent truncate py-1 px-2 rounded hover:bg-elevated"
                  >
                    {r.displayName}
                  </button>
                ))}
              </div>
            )}
            {toPlace && (
              <p className="text-[10px] text-accent mt-1 truncate">✓ {toPlace.displayName}</p>
            )}
          </div>

          <button
            onClick={calculateRoute}
            disabled={!fromPlace || !toPlace || routing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-500 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
          >
            {routing ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            Calculate route
          </button>

          {route && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">Distance</span>
                <span className="font-semibold text-primary">{route.distanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-secondary">Duration</span>
                <span className="font-semibold text-primary">{Math.round(route.durationMin)} min</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">
            Distance (km)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={manualDist}
            onChange={(e) => setManualDist(e.target.value)}
            placeholder="Enter distance travelled"
            className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50"
          />
        </div>
      )}

      {/* Result + add */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center px-3 rounded-lg bg-accent-light border border-accent/20 min-h-[38px]">
          <span className="text-sm font-bold text-accent-text tabular-nums">{formatGrams(grams)}</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || grams <= 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Log
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// --- Food: Open Food Facts API ---
function FoodCalculator({
  saving,
  onAdd,
  location,
}: {
  saving: boolean;
  onAdd: (e: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>) => Promise<void>;
  location: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [servings, setServings] = useState('1');

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    setResults([]);
    setSelected(null);
    try {
      const data = await searchFood(query);
      if (data.length === 0) {
        setError('No products found. Try a different search term.');
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Food search failed');
    } finally {
      setSearching(false);
    }
  };

  const grams = selected ? Math.round(selected.grams * (parseFloat(servings) || 1)) : 0;

  const handleAdd = async () => {
    if (!selected || grams <= 0) return;
    await onAdd({
      category: 'food',
      activity: selected.productName,
      detail: `${servings} serving(s) · ${selected.source}`,
      grams,
      accuracy: 'estimated',
      grid_factor: null,
      location,
    });
    setSelected(null);
    setServings('1');
  };

  return (
    <div className="rounded-xl glass p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        <UtensilsCrossed size={13} className="text-amber-500" />
        <span>Carbon data from Open Food Facts</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search for a food product..."
          className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/50"
        />
        <button
          onClick={search}
          disabled={searching}
          className="px-3 rounded-lg glass text-secondary hover:bg-input transition-colors"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      {results.length > 0 && !selected && (
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelected(r)}
              className="w-full flex items-center gap-2.5 text-left rounded-lg glass glass-hover px-2.5 py-2 hover:bg-elevated transition-colors"
            >
              {r.imageUrl ? (
                <img src={r.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed size={14} className="text-amber-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-primary truncate">{r.productName}</p>
                <p className="text-[9px] text-muted">{r.source}</p>
              </div>
              <span className="text-xs font-semibold text-amber-600 tabular-nums flex-shrink-0">{formatGrams(r.grams)}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-2.5">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
            <div className="flex items-center gap-2">
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary truncate">{selected.productName}</p>
                <p className="text-[10px] text-secondary">{selected.source}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">Servings</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex-1 flex items-center px-3 rounded-lg bg-accent-light border border-accent/20 min-h-[38px]">
              <span className="text-sm font-bold text-accent-text tabular-nums">{formatGrams(grams)}</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || grams <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Energy: location-adjusted ---
function EnergyCalculator({
  saving,
  onAdd,
  gridFactor,
  location,
}: {
  saving: boolean;
  onAdd: (e: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>) => Promise<void>;
  gridFactor: number | null;
  location: string | null;
}) {
  const [activityId, setActivityId] = useState('electricity');
  const [quantity, setQuantity] = useState('1');
  const activities = ACTIVITIES.energy;
  const activity = activities.find((a) => a.id === activityId) ?? activities[0];
  const qty = parseFloat(quantity) || 0;
  const { grams, accuracy } = computeGrams(activity, qty, gridFactor);

  const handleAdd = async () => {
    if (grams <= 0) return;
    await onAdd({
      category: 'energy',
      activity: activity.label,
      detail: `${qty} ${activity.unit}`,
      grams,
      accuracy,
      grid_factor: activity.energyCategory ? gridFactor : null,
      location,
    });
    setQuantity('1');
  };

  return (
    <div className="rounded-xl glass p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        <Zap size={13} className="text-yellow-500" />
        <span>Adjusted for your local grid intensity</span>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">Activity</label>
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">
          Quantity ({activity.unit})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
          />
          <div className="flex items-center px-3 rounded-lg bg-accent-light border border-accent/20 min-w-[110px] justify-center">
            <span className="text-sm font-bold text-accent-text tabular-nums">{formatGrams(grams)}</span>
          </div>
        </div>
        {accuracy === 'location-adjusted' && (
          <p className="text-[10px] text-accent/70 mt-1">
            Using {gridFactor ?? WORLD_GRID} gCO₂/kWh
          </p>
        )}
      </div>
      <button
        onClick={handleAdd}
        disabled={saving || qty <= 0}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Log entry
      </button>
    </div>
  );
}

// --- Simple fallback for shopping/other ---
function SimpleCalculator({
  category,
  activities,
  saving,
  onAdd,
  location,
}: {
  category: CategoryId;
  activities: ActivityOption[];
  saving: boolean;
  onAdd: (e: Omit<ManualEntry, 'id' | 'user_id' | 'logged_at'>) => Promise<void>;
  location: string | null;
}) {
  const [activityId, setActivityId] = useState(activities[0].id);
  const [quantity, setQuantity] = useState('1');
  const activity = activities.find((a) => a.id === activityId) ?? activities[0];
  const qty = parseFloat(quantity) || 0;
  const grams = Math.round(activity.perUnit * qty);

  const handleAdd = async () => {
    if (grams <= 0) return;
    await onAdd({
      category,
      activity: activity.label,
      detail: `${qty} ${activity.unit}`,
      grams,
      accuracy: 'estimated',
      grid_factor: null,
      location,
    });
    setQuantity('1');
  };

  return (
    <div className="rounded-xl glass p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs text-secondary">
        {category === 'shopping' ? <ShoppingBag size={13} className="text-pink-500" /> : <CircleDot size={13} className="text-muted" />}
        <span>Estimated emission factors</span>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">Activity</label>
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="w-full bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted mb-1 block">
          Quantity ({activity.unit})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 bg-input border border-default rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50"
          />
          <div className="flex items-center px-3 rounded-lg bg-accent-light border border-accent/20 min-w-[110px] justify-center">
            <span className="text-sm font-bold text-accent-text tabular-nums">{formatGrams(grams)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={saving || qty <= 0}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Log entry
      </button>
    </div>
  );
}
