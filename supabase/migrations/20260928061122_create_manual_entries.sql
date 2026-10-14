/*
# Manual carbon entries + user profiles

1. Purpose
   Adds cloud persistence for user-created carbon footprint entries
   (food, transport, energy, etc.) plus a profile table that stores the
   user's location for grid-intensity-based calculation accuracy.

2. New Tables
   - `manual_entries`
     - `id` uuid primary key
     - `user_id` uuid, defaults to auth.uid(), references auth.users
     - `category` text (food, transport, energy, shopping, other)
     - `activity` text (e.g. "Beef meal", "Car trip", "Laundry")
     - `detail` text (optional extra description / amount)
     - `grams` numeric (CO2e grams, computed by the app)
     - `accuracy` text ('estimated' | 'location-adjusted' | 'precise')
     - `grid_factor` numeric (grid intensity gCO2/kWh used, or null)
     - `location` text (city/region label, or null)
     - `logged_at` timestamptz, defaults to now()
   - `profiles`
     - `user_id` uuid primary key, references auth.users
     - `location` text (city/region label)
     - `grid_factor` numeric (local grid intensity gCO2/kWh)

3. Security
   - Enable RLS on both tables.
   - manual_entries: owner-scoped CRUD (TO authenticated, auth.uid() = user_id).
   - profiles: owner-scoped CRUD (TO authenticated, auth.uid() = user_id).

4. Notes
   - user_id columns default to auth.uid() so inserts that omit user_id succeed.
   - No public/anon access — this app requires sign-in.
*/

CREATE TABLE IF NOT EXISTS manual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  activity text NOT NULL,
  detail text,
  grams numeric NOT NULL DEFAULT 0,
  accuracy text NOT NULL DEFAULT 'estimated',
  grid_factor numeric,
  location text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entries" ON manual_entries;
CREATE POLICY "select_own_entries" ON manual_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entries" ON manual_entries;
CREATE POLICY "insert_own_entries" ON manual_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entries" ON manual_entries;
CREATE POLICY "update_own_entries" ON manual_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entries" ON manual_entries;
CREATE POLICY "delete_own_entries" ON manual_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_manual_entries_user_logged
  ON manual_entries (user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location text,
  grid_factor numeric
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);