-- KitchenOS — Intelligence Reports Table
-- Run this in your Supabase SQL Editor.

-- Create the intelligence_reports table
CREATE TABLE IF NOT EXISTS intelligence_reports (
    report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kitchen_id uuid NOT NULL REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    type text NOT NULL, -- e.g., 'margin_analysis', 'wastage_intelligence', 'weekly_forecast'
    title text NOT NULL,
    summary text,
    metrics jsonb DEFAULT '{}'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster querying by kitchen_id
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_kitchen_id ON intelligence_reports(kitchen_id);

-- Enable Row-Level Security
ALTER TABLE intelligence_reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- RLS POLICIES
-- ---------------------------------------------------------------

-- Drop policies if they already exist (idempotent setup)
DROP POLICY IF EXISTS "kitchen_select" ON intelligence_reports;
DROP POLICY IF EXISTS "kitchen_insert" ON intelligence_reports;
DROP POLICY IF EXISTS "kitchen_update" ON intelligence_reports;
DROP POLICY IF EXISTS "kitchen_delete" ON intelligence_reports;

-- Scoped SELECT: only own kitchen's reports
CREATE POLICY "kitchen_select" ON intelligence_reports
  FOR SELECT USING (
    kitchen_id = (
      SELECT kitchen_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Scoped INSERT: allow inserting into own kitchen (mostly used by Service Role anyway)
CREATE POLICY "kitchen_insert" ON intelligence_reports
  FOR INSERT WITH CHECK (
    kitchen_id = (
      SELECT kitchen_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Scoped UPDATE: allow updating (e.g. marking as read)
CREATE POLICY "kitchen_update" ON intelligence_reports
  FOR UPDATE USING (
    kitchen_id = (
      SELECT kitchen_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Scoped DELETE: allow owner to delete reports
CREATE POLICY "kitchen_delete" ON intelligence_reports
  FOR DELETE USING (
    kitchen_id = (
      SELECT kitchen_id FROM profiles WHERE user_id = auth.uid()
    )
  );
