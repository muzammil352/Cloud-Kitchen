-- KitchenOS — RLS INSERT policies for onboarding
-- Run this in the Supabase SQL Editor.
-- These policies allow authenticated users to create their own kitchen and profile
-- during signup. Without them the /api/onboarding route will return 500.

-- ── kitchens ────────────────────────────────────────────────────────────────
-- Allow an authenticated user to create a kitchen they own
DROP POLICY IF EXISTS "Owners can insert their kitchen" ON kitchens;
CREATE POLICY "Owners can insert their kitchen"
  ON kitchens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Allow an authenticated user to create their own profile row
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
