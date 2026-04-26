# KitchenOS — Project Memory Document
> Last updated: April 2026. Feed this to your Claude project knowledge before starting any new session.

---

## 1. WHAT THIS PROJECT IS

KitchenOS is a multi-tenant SaaS operations platform for cloud kitchen owners in Pakistan. It is deployed on Vercel and uses Supabase for database and authentication.

**Live URL:** Deployed on Vercel (GitHub repo: muzammil352/Cloud-Kitchen)
**Stack:** Next.js 14 App Router · TypeScript · Supabase (Postgres + Auth) · Tailwind CSS (mostly unused — UI is inline styles) · Lucide icons

---

## 2. CURRENT ARCHITECTURE

### 2.1 App Router Structure

```
app/
  layout.tsx                  — Root layout. Loads Fraunces + DM Sans + JetBrains Mono fonts.
  globals.css                 — All design tokens + component styles (no Tailwind utilities in use for main UI)
  (auth)/
    login/page.tsx            — Surface B: Login page
    signup/page.tsx           — Surface B: Signup + kitchen creation
  dashboard/
    layout.tsx                — Supabase auth guard + Sidebar + ProfileBanner
    page.tsx                  — Overview: stat cards, recent orders, live orders
    orders/page.tsx           — Orders table with inline detail panel
    menu/page.tsx             — Menu management (owner only)
    customers/page.tsx        — Customer list + detail panel
    reports/page.tsx          — Revenue, top items, satisfaction, stock reports
    approvals/page.tsx        — Pending automation approvals
    settings/page.tsx         — Kitchen profile + notification channel + slug
  (customer)/
    [slug]/page.tsx           — Customer storefront (menu, cart, order placement)
    [slug]/track/page.tsx     — Order tracking by UUID or 8-char short ID
    [slug]/feedback/page.tsx  — Post-delivery rating form
  kitchen/
    page.tsx                  — KDS (Kitchen Display System) — order queue
    wastage/page.tsx          — Ingredient wastage logging
  api/
    approve/route.ts          — Approve automation action (owner only, server-side)
    feedback/route.ts         — Proxy to N8N feedback webhook (server-side)
public/
  landing.html                — KitchenOS marketing landing page (standalone HTML/CSS/JS)
```

### 2.2 Key Components

```
components/
  dashboard/
    Sidebar.tsx               — Collapsible nav (68px → 220px), hover-expand, role-aware
    ProfileBanner.tsx         — Incomplete profile warning banner
  shared/
    StatusBadge.tsx           — Semantic order status pill using design system tokens
```

### 2.3 Root URL Routing

`app/page.tsx` does NOT exist — it was deliberately deleted. The root URL `/` is served via a `next.config.mjs` rewrite:
```js
rewrites: [{ source: '/', destination: '/landing.html' }]
```
`public/landing.html` is the marketing landing page (standalone HTML file, no Next.js).

---

## 3. DATABASE SCHEMA (SUPABASE)

### Core Tables
- `kitchens` — `kitchen_id`, `owner_user_id`, `name`, `slug`, `email`, `phone`, `city`, `settings (jsonb)`, `accent_color`
- `profiles` — `user_id`, `kitchen_id`, `role` (owner | employee), `name`
- `orders` — `order_id (uuid)`, `kitchen_id`, `customer_id`, `status`, `total_amount`, `created_at`, `delivery_address`, `notes`
- `order_items` — `order_item_id`, `order_id`, `menu_item_id`, `quantity`, `unit_price`
- `menu_items` — `menu_item_id`, `kitchen_id`, `name`, `description`, `price`, `category`, `is_active`, `image_url`
- `customers` — `customer_id`, `kitchen_id`, `name`, `phone`, `email`
- `notifications_log` — `id`, `kitchen_id`, `type` (low_stock | win_back | upsell), `status` (pending | approved | rejected), `payload (jsonb)`
- `ingredients` — `ingredient_id`, `kitchen_id`, `name`, `unit`, `current_stock`, `reorder_threshold`
- `wastage_log` — `wastage_id`, `kitchen_id`, `ingredient_id`, `quantity_wasted`, `reason`, `created_at`
- `feedback` — `feedback_id`, `order_id`, `kitchen_id`, `rating`, `comment`, `created_at`

### Key RPC Function
```sql
find_order_by_prefix(p_prefix text, p_kitchen_id uuid)
RETURNS TABLE(order_id uuid)
```
Used by the customer Track Order panel to support 8-character short ID lookup. It does `order_id::text ILIKE (p_prefix || '%')`.

---

## 4. AUTHENTICATION & AUTHORIZATION

### Auth Flow
- **Supabase Auth** handles login/signup
- Root layout does NOT check auth — individual layouts do
- `dashboard/layout.tsx` runs `supabase.auth.getUser()` (server-side, secure) and redirects to `/login` if not authenticated
- Profiles must have `role = 'owner' | 'employee'` to access the dashboard

### Role Rules
- **Owner**: full access to all dashboard pages
- **Employee**: can only see Dashboard and Orders pages; Sidebar hides all other nav items
- Revenue/spend data is blurred/hidden for employees on the Overview page

### Security Hardening Applied (all live)
All of the following are already in the codebase:

1. **`app/api/approve/route.ts`** — Server-side only. Requires authenticated owner. Zod UUID validation on token. N8N URL read from server-only env var `N8N_WEBHOOK_URL`.
2. **`app/api/feedback/route.ts`** — Server-side proxy for N8N feedback. Zod validation on all fields. Client never touches N8N directly.
3. **`app/(customer)/[slug]/feedback/page.tsx`** — Calls `/api/feedback` (proxy), not N8N directly.
4. **`app/(customer)/[slug]/page.tsx`** — Uses `getUser()` not `getSession()` for auth check.
5. **`lib/supabase/client.ts`** and **`lib/supabase/server.ts`** — Throw clear errors if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.
6. **`components/dashboard/Sidebar.tsx`** — Notifications query scoped to `kitchen_id`.

### ENV VAR IMPORTANT NOTE
The N8N webhook URL must be stored as `N8N_WEBHOOK_URL` (no `NEXT_PUBLIC_` prefix) in Vercel environment variables. If it was previously `NEXT_PUBLIC_N8N_WEBHOOK_URL`, that name needs to be updated in the Vercel dashboard.

### Pending SQL (user must run manually in Supabase SQL Editor)
These RLS policy changes have NOT been applied yet — they are pending:

```sql
-- 1. Replace USING (true) SELECT policies on orders/customers/order_items
--    with kitchen_id-scoped policies (prevents cross-kitchen data leakage)

-- 2. Replace WITH CHECK (true) INSERT policies on same tables
--    with authenticated-only policies

-- 3. find_order_by_prefix: drop and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS find_order_by_prefix(text, uuid);
CREATE FUNCTION find_order_by_prefix(p_prefix text, p_kitchen_id uuid)
RETURNS TABLE(order_id uuid) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT order_id FROM orders
  WHERE kitchen_id = p_kitchen_id
    AND order_id::text ILIKE (p_prefix || '%')
  LIMIT 1;
$$;
```

---

## 5. DESIGN SYSTEM — "KARACHI CONCRETE"

The full design system is in `DESIGN_SYSTEM.md`. Key facts:

### Fonts (loaded via next/font/google in app/layout.tsx)
- **Display/Headings**: Fraunces (weights 400, 600) → CSS var `--font-display`
- **Body/UI**: DM Sans (weights 400, 500, 600) → CSS var `--font-body`
- **Monospace/Numbers**: JetBrains Mono (weights 400, 500) → CSS var `--font-mono`
- **`--font-ui`** is an alias for `--font-body` (backward compat)

### Core Color Tokens (defined in globals.css)
```css
--color-bg:          #F5F2ED   /* Warm plaster — main background */
--color-surface:     #FFFFFF   /* Cards/panels */
--color-surface-2:   #F0EDE8   /* Sidebar, nested panels */
--color-border:      rgba(26,25,23,0.08)
--color-border-mid:  rgba(26,25,23,0.15)
--color-ink:         #1A1917   /* Primary text */
--color-ink-2:       #4A4741   /* Secondary text */
--color-ink-3:       #7A746D   /* Muted/caption */
--color-accent:      #D4531A   /* Burnt saffron — ALL primary CTAs */
--color-accent-bg:   rgba(212,83,26,0.08)
--color-accent-dark: #A83D10   /* Hover state */
--color-green:       #2D7A4F   /* Confirmed, delivered, OK */
--color-amber:       #C47A1E   /* Pending, warning */
--color-red:         #C0392B   /* Cancelled, critical */
--color-blue:        #2563EB   /* Informational */
```

### Backward-Compat Aliases (old var names still work)
Old names like `var(--accent)`, `var(--text-primary)`, `var(--text-muted)`, `var(--border)`, `var(--bg-start)`, `var(--surface)`, `var(--radius-card)`, `var(--shadow-card)` are aliased in globals.css to the new tokens. Any old code referencing them still works.

### Visual Surfaces
- **Surface A** — Marketing (`public/landing.html`) — dark, editorial, GSAP animations
- **Surface B** — Auth (`/login`, `/signup`) — warm plaster bg, grain texture, KitchenOS wordmark above card
- **Surface C** — Dashboard — warm plaster + grain + drafting grid, full-height sidebar
- **Surface D** — Customer storefront (`/[slug]`) — kitchen's accent colour header
- **Surface E** — KDS (`/kitchen`) — dark (#0D0D0D), high contrast

### Key Design Rules
- Primary CTA buttons use `--color-accent` (#D4531A burnt saffron), pill-shaped, `--shadow-accent`
- Status badges: JetBrains Mono, 11px, uppercase, pill-shaped, semantic bg/text pairs
- Sidebar: 68px collapsed, 220px expanded on hover, KOS monogram when collapsed
- Active nav item: `--color-accent-bg` bg + 3px left border in `--color-accent`
- Stat card numbers in dashboard: Fraunces 600, 32px

---

## 6. FEATURES — CURRENT STATE

### Marketing Landing Page (`/`)
- Standalone `public/landing.html` — no React, pure HTML/CSS/JS
- GSAP + ScrollTrigger: sticky stacking panels, custom cursor, scroll-triggered reveals
- Sections: Hero (live dashboard mockup), social proof counters, 3 animated feature demos, 4 stacking panels, pricing (3 tiers), footer
- CTA buttons link to `/signup` and `/login`
- Served via next.config.mjs rewrite (NOT an App Router page)

### Auth Pages (`/login`, `/signup`)
- Surface B design: warm plaster background, SVG grain, KitchenOS wordmark above card
- Signup creates: auth user → kitchen row → profile row, all in sequence
- Password strength bar on signup (4-segment, red/amber/accent/green)
- Error state: red left-border alert with AlertCircle icon, positioned above submit button

### Dashboard Sidebar
- Fixed left, full-height (0,0 to 100vh), no floating/rounded style
- Collapses to 68px (icon only) on mouse-leave, expands to 220px on hover
- Logo: "KOS" (accent) when collapsed → "Kitchen" (ink) + "OS" (accent) when expanded
- Role-aware: employees see only Dashboard + Orders
- Pending approvals: small red dot (8px) on Approvals icon, not a count badge
- Avatar at bottom: initials circle → click → dropdown with Settings + Sign out

### Dashboard Overview (`/dashboard`)
- 4 stat cards with Fraunces 600 32px numbers
- Revenue card blurred for employees
- Low stock card: amber left border if count > 0
- Two-column grid: Recent Orders table (6 rows) + Top Items with volume bars
- Live Orders section with pulsing green dot

### Customer Storefront (`/[slug]`)
- Serves as the kitchen's public ordering page
- Kitchen accent color in header
- "Back to Dashboard" button visible only to the owner of that kitchen
- Cart system, order placement, connects to Supabase

### Order Tracking (`/[slug]/track`)
- Supports BOTH full UUID and 8-character short ID
- Short ID lookup via `find_order_by_prefix` RPC function in Supabase
- UUID is a capability token (anonymous customers can view orders if they have the ID)

### Feedback (`/[slug]/feedback`)
- Posts to `/api/feedback` (server-side proxy), never directly to N8N

### Approvals (`/dashboard/approvals`)
- Owner reviews pending automation actions (low_stock, win_back, upsell)
- Approve/reject sends to N8N webhook via `/api/approve`

### KDS — Kitchen Display System (`/kitchen`)
- Dark surface (Surface E)
- Order queue for kitchen staff
- Wastage logging at `/kitchen/wastage`

---

## 7. IMPORTANT IMPLEMENTATION DECISIONS

**Why `app/page.tsx` doesn't exist:** The marketing landing page is a standalone HTML file (`public/landing.html`) because it has complex GSAP animations that don't fit the React component model. A `next.config.mjs` rewrite maps `/` to `/landing.html`. If you create `app/page.tsx`, it will take priority over the rewrite and the landing page will break.

**Why `eslint: { ignoreDuringBuilds: true }` in next.config.mjs:** There are 30+ pre-existing ESLint errors in the codebase (`no-explicit-any`, `no-unescaped-entities`, etc.) across many files. Fixing them is a future task. Removing this flag will fail Vercel builds.

**Why server components cannot have event handlers:** Next.js 14 App Router uses React 18 RSC (React Server Components). Functions (including event handlers) cannot be serialized in the RSC payload. If you add `onClick`, `onMouseEnter`, etc. to a native element inside a server component (any `async` page or layout without `'use client'`), it will throw a runtime server error. Use CSS `:hover` rules via `<style>` tags instead.

**Why `getUser()` not `getSession()`:** `getSession()` reads from a cookie without server verification — it can be spoofed. `getUser()` makes a round-trip to Supabase to verify the JWT. All auth checks in this codebase now use `getUser()`.

**Why order tracking uses UUID as capability token:** Customer order tracking is publicly accessible by design — anyone who knows the UUID can track the order. This is intentional: the 128-bit UUID is effectively proof of authorization. No additional auth gate is needed.

**Supabase client creation:** Both `lib/supabase/client.ts` and `lib/supabase/server.ts` throw explicit errors if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, rather than silently creating a broken client.

---

## 8. FILES TO READ BEFORE WORKING ON A SURFACE

| Surface | Key files to read |
|---|---|
| Marketing (A) | `public/landing.html`, `next.config.mjs` |
| Auth (B) | `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` |
| Dashboard (C) | `app/dashboard/layout.tsx`, `components/dashboard/Sidebar.tsx`, `app/dashboard/page.tsx` |
| Customer (D) | `app/(customer)/[slug]/page.tsx`, `app/(customer)/[slug]/track/page.tsx` |
| KDS (E) | `app/kitchen/page.tsx`, `app/kitchen/wastage/page.tsx` |
| Design tokens | `app/globals.css` (tokens), `DESIGN_SYSTEM.md` (full spec) |
| Page inventory | `PAGE_STRUCTURE.md` |

---

## 9. N8N AUTOMATION WEBHOOKS

### Database Webhooks (Supabase pg_net triggers)
SQL is in `supabase/webhooks.sql`. Run in Supabase SQL Editor once.

| Webhook | Trigger | Table | Event |
|---|---|---|---|
| Menu Costing & Margin Analysis (T1.3 + T3.4) | `trg_menu_costing_webhook` | `menu_items` | INSERT, UPDATE |
| Inventory Value Calculation (T3.5) | `trg_inventory_value_webhook` | `ingredients` | INSERT, UPDATE |
| Stockout Prediction (T3.1) | `trg_stockout_prediction_webhook` | `ingredients` | UPDATE (stock decrease only) |
| Wastage Intelligence (T3.3) | `trg_wastage_intelligence_webhook` | `wastage_log` | INSERT |
| Smart Purchase Plan (T4.7) | `trg_smart_purchase_plan_webhook` | `notifications_log` | INSERT (low_stock only) |

### Scheduled Webhook (Vercel Cron)
- **Weekly Demand Forecast (T4.6)** — fires every Monday at 03:00 PKT (22:00 UTC Sunday)
- Route: `app/api/cron/weekly-forecast/route.ts`
- Schedule in `vercel.json`: `"0 22 * * 0"`
- Env var: `N8N_WEEKLY_FORECAST_URL`
- Protected by `CRON_SECRET` header (set in Vercel dashboard → Project Settings → Environment Variables)

### Vercel Environment Variables to Add
```
N8N_WEEKLY_FORECAST_URL=https://n8n.devplusops.com/webhook/a6d75856-be17-48a1-9ba7-a442d4faff34
CRON_SECRET=<random secret string>
```

---

## 10. PENDING TASKS (user action required)

1. **Run Database Webhooks SQL**: `supabase/webhooks.sql` in Supabase SQL Editor. Requires pg_net extension (enabled by default).

2. **Add Vercel env vars**: `N8N_WEEKLY_FORECAST_URL` and `CRON_SECRET` in Vercel dashboard → Project Settings → Environment Variables.

3. **Vercel env var rename**: `NEXT_PUBLIC_N8N_WEBHOOK_URL` → `N8N_WEBHOOK_URL` (in Vercel dashboard). The approval/feedback API routes will fail silently until this is done.

4. **Run RLS SQL in Supabase**: The three SQL blocks in Section 4 above (critical security — replace open SELECT/INSERT policies with kitchen_id-scoped ones).

5. **ESLint cleanup**: 30+ pre-existing lint errors. Future task before `ignoreDuringBuilds` can be removed.

6. **Apply design system to remaining pages**: Customer storefront + tracking (Surface D full spec), KDS pages (Surface E dark spec).
