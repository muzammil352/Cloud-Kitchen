-- KitchenOS — N8N Database Webhooks
-- Run this in the Supabase SQL Editor.
-- Requires the pg_net extension (enabled by default on Supabase).
-- These triggers fire HTTP POST requests to N8N when table events occur.

-- ---------------------------------------------------------------
-- ENABLE pg_net
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ---------------------------------------------------------------
-- 1. MENU COSTING & MARGIN ANALYSIS (T1.3 + T3.4)
--    Fires on: menu_items INSERT or UPDATE
--    Lets N8N recalculate margins / food cost % for the item.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _webhook_menu_costing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM pg_net.http_post(
    url     := 'https://n8n.devplusops.com/webhook/4d8f06a0-08c1-4580-b9be-165bce018085',
    body    := jsonb_build_object(
      'event',      TG_OP,
      'table',      TG_TABLE_NAME,
      'record',     row_to_json(NEW),
      'kitchen_id', NEW.kitchen_id
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_costing_webhook ON menu_items;
CREATE TRIGGER trg_menu_costing_webhook
  AFTER INSERT OR UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION _webhook_menu_costing();


-- ---------------------------------------------------------------
-- 2. INVENTORY VALUE CALCULATION (T3.5)
--    Fires on: ingredients INSERT or UPDATE
--    Lets N8N compute total inventory value (stock × unit_cost).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _webhook_inventory_value()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM pg_net.http_post(
    url     := 'https://n8n.devplusops.com/webhook/89dbae28-f10e-442b-93c2-7e22f64cab54',
    body    := jsonb_build_object(
      'event',      TG_OP,
      'table',      TG_TABLE_NAME,
      'record',     row_to_json(NEW),
      'kitchen_id', NEW.kitchen_id
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_value_webhook ON ingredients;
CREATE TRIGGER trg_inventory_value_webhook
  AFTER INSERT OR UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION _webhook_inventory_value();


-- ---------------------------------------------------------------
-- 3. STOCKOUT PREDICTION (T3.1)
--    Fires on: ingredients UPDATE when current_stock decreases
--    Lets N8N predict days-until-stockout based on consumption rate.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _webhook_stockout_prediction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only fire when stock actually decreases
  IF NEW.current_stock < OLD.current_stock THEN
    PERFORM pg_net.http_post(
      url     := 'https://n8n.devplusops.com/webhook/453bcd5f-368f-44d2-a376-d6010d7d6084',
      body    := jsonb_build_object(
        'event',               'STOCK_DECREASE',
        'table',               TG_TABLE_NAME,
        'ingredient_id',       NEW.ingredient_id,
        'ingredient_name',     NEW.name,
        'kitchen_id',          NEW.kitchen_id,
        'previous_stock',      OLD.current_stock,
        'current_stock',       NEW.current_stock,
        'reorder_threshold',   NEW.reorder_threshold,
        'unit',                NEW.unit
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stockout_prediction_webhook ON ingredients;
CREATE TRIGGER trg_stockout_prediction_webhook
  AFTER UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION _webhook_stockout_prediction();


-- ---------------------------------------------------------------
-- 4. WASTAGE INTELLIGENCE (T3.3)
--    Fires on: wastage_log INSERT
--    Lets N8N analyse wastage patterns and flag recurring issues.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _webhook_wastage_intelligence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM pg_net.http_post(
    url     := 'https://n8n.devplusops.com/webhook/f5033b62-26b6-4076-a17d-6d76bad21611',
    body    := jsonb_build_object(
      'event',            'WASTAGE_LOGGED',
      'table',            TG_TABLE_NAME,
      'wastage_id',       NEW.wastage_id,
      'kitchen_id',       NEW.kitchen_id,
      'ingredient_id',    NEW.ingredient_id,
      'quantity_wasted',  NEW.quantity_wasted,
      'reason',           NEW.reason,
      'logged_at',        NEW.created_at
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wastage_intelligence_webhook ON wastage_log;
CREATE TRIGGER trg_wastage_intelligence_webhook
  AFTER INSERT ON wastage_log
  FOR EACH ROW EXECUTE FUNCTION _webhook_wastage_intelligence();


-- ---------------------------------------------------------------
-- 6. SMART PURCHASE PLAN (T4.7)
--    Fires on: notifications_log INSERT where type = 'low_stock'
--    Lets N8N generate a consolidated purchase plan when low-stock
--    alerts accumulate.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION _webhook_smart_purchase_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.type = 'low_stock' THEN
    PERFORM pg_net.http_post(
      url     := 'https://n8n.devplusops.com/webhook/39f2b6aa-e71b-441f-84cf-1c56cc7ca061',
      body    := jsonb_build_object(
        'event',           'LOW_STOCK_ALERT',
        'notification_id', NEW.id,
        'kitchen_id',      NEW.kitchen_id,
        'payload',         NEW.payload,
        'created_at',      NEW.created_at
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_smart_purchase_plan_webhook ON notifications_log;
CREATE TRIGGER trg_smart_purchase_plan_webhook
  AFTER INSERT ON notifications_log
  FOR EACH ROW EXECUTE FUNCTION _webhook_smart_purchase_plan();
