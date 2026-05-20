-- KitchenOS — RLS policies
-- Run this in the Supabase SQL Editor.

-- ── kitchens ────────────────────────────────────────────────────────────────
-- Allow an authenticated user to create a kitchen they own
DROP POLICY IF EXISTS "Owners can insert their kitchen" ON kitchens;
CREATE POLICY "Owners can insert their kitchen"
  ON kitchens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Allow owners to update their own kitchen (settings, slug, etc.)
DROP POLICY IF EXISTS "Owners can update their kitchen" ON kitchens;
CREATE POLICY "Owners can update their kitchen"
  ON kitchens FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Allow anyone (including anon) to read kitchens — needed for the public storefront
DROP POLICY IF EXISTS "Public can read kitchens" ON kitchens;
CREATE POLICY "Public can read kitchens"
  ON kitchens FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Allow an authenticated user to create their own profile row
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
