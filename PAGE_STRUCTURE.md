# KitchenOS — Page Structure Reference

> Use this document to understand every page in the app before applying a design identity. Each entry covers: route, who sees it, what it shows, what data it uses, and any notable behaviour.

---

## Table of Contents

1. [Landing Page](#1-landing-page)
2. [Auth — Login](#2-login)
3. [Auth — Signup](#3-signup)
4. [Customer — Menu / Storefront](#4-customer-storefront-slug)
5. [Customer — Order Tracking](#5-customer-order-tracking-slugtrack)
6. [Customer — Feedback](#6-customer-feedback-slugfeedback)
7. [Dashboard — Overview](#7-dashboard-overview-dashboard)
8. [Dashboard — Orders](#8-dashboard-orders-dashboardorders)
9. [Dashboard — Menu Manager](#9-dashboard-menu-dashboardmenu)
10. [Dashboard — Customers](#10-dashboard-customers-dashboardcustomers)
11. [Dashboard — Reports](#11-dashboard-reports-dashboardreports)
12. [Dashboard — Approvals](#12-dashboard-approvals-dashboardapprovals)
13. [Dashboard — Settings](#13-dashboard-settings-dashboardsettings)
14. [Kitchen Display — Queue](#14-kitchen-display-system-kitchen)
15. [Kitchen Display — Wastage](#15-kitchen-wastage-log-kitchenwastage)
16. [Shared Layouts](#16-shared-layouts)

---

## 1. Landing Page

| Field | Value |
|---|---|
| **Route** | `/` |
| **File** | `public/landing.html` (served via Next.js rewrite) |
| **Access** | Public — anyone |
| **Tech** | Standalone HTML, GSAP, Lucide, Google Fonts (no React) |

### What it shows
- **Navbar** — floating pill, morphs to frosted glass on scroll. Logo, 4 nav links, Sign in → `/login`, Start free → `/signup`
- **Hero** — two-column layout. Left: headline copy + CTAs. Right: live CSS/JS mini-dashboard mockup (kanban board, stat pills, pulsing notification card)
- **Social proof bar** — dark strip, 4 stat counters (orders, confirmation time, workflows, setup cost)
- **Features (3 cards)** — Live Order Feed (self-updating terminal), Inventory Radar (bar chart with draining stock), Notification Scheduler (WhatsApp chat sequence)
- **How it works (4 panels)** — sticky stacking cards on desktop. Flow: Customer orders → You're notified → Kitchen confirms & stock adjusts → Loop closes itself
- **Pricing** — 3 tiers: Starter (Rs. 0), Operator (Rs. 2,999), Chain (Custom). Operator card is featured/elevated
- **Footer** — dark, rounded top corners. Nav columns + system status indicator

### Design identity notes
- Palette: `#F5F2ED` warm off-white background, `#D4531A` burnt saffron accent, `#111110` dark sections
- Fonts: Fraunces (display/italic), DM Sans (body), JetBrains Mono (data/labels)
- Texture: SVG noise overlay + drafting grid + giant `KITCHEN` background word

---

## 2. Login

| Field | Value |
|---|---|
| **Route** | `/login` |
| **File** | `app/(auth)/login/page.tsx` |
| **Access** | Public (redirects to `/dashboard` if already signed in) |
| **Tech** | Client Component |

### What it shows
- "CK" logomark (42×42 rounded box)
- Heading: "Welcome back" + subtitle
- Email field
- Password field with show/hide toggle
- "Forgot password?" link
- Sign in button (full-width)
- Error message box (red left-border)
- Link to signup

### Data & behaviour
- `supabase.auth.signInWithPassword()` on submit
- Redirects to `/dashboard` on success

### Design identity notes
- Centred card on a plain background
- Minimal — no sidebar, no nav
- Error state: red left-border box above the form

---

## 3. Signup

| Field | Value |
|---|---|
| **Route** | `/signup` |
| **File** | `app/(auth)/signup/page.tsx` |
| **Access** | Public |
| **Tech** | Client Component |

### What it shows
- "CK" logomark
- Heading: "Set up your kitchen"
- Kitchen Name field
- First Name + Last Name (two-column)
- Email field
- Password field + show/hide toggle
- **Password strength bar** — 4-segment colour indicator (Weak / Fair / Good / Strong)
- Confirm Password + toggle
- Create Account button
- Terms of Service link
- Error display
- Link back to login

### Data & behaviour
Sequential writes on submit:
1. `supabase.auth.signUp()` — creates auth user
2. INSERT into `kitchens` — name, email, `settings: {notify_channel: 'email'}`
3. INSERT into `profiles` — `role: 'owner'`, linked kitchen

Redirects to `/dashboard` on success.

### Design identity notes
- Same card-centred layout as login
- Password strength bar is the one interactive element unique to this page

---

## 4. Customer Storefront (`/[slug]`)

| Field | Value |
|---|---|
| **Route** | `/{kitchen-slug}` e.g. `/burger-hub-e22f4e` |
| **File** | `app/(customer)/[slug]/page.tsx` → `components/customer/MenuPageClient.tsx` |
| **Access** | Public — anyone with the link |
| **Tech** | Server Component (data fetch) + Client Component (interactivity) |

### What it shows
- **Header bar** — kitchen name, back button, search input, cart icon with item count badge, optional "Back to Dashboard" button (owner only)
- **Category tabs** — horizontal scrollable tabs, one per category. Active tab highlighted. Auto-scrolls to section on click
- **Menu grid** — cards per item: image thumbnail, name, description, price (mono), dietary tags, favorite toggle (heart), quantity selector (–/+) or Add button
- **Reviews section** — latest 6 feedback cards: star rating, comment, customer name, date
- **Track Order panel** — slide-over triggered by a button. Input for order ID (short 8-char or full UUID). Shows order status after lookup
- **Cart sheet** — slide-over from the right. Lists added items with quantities, subtotal, checkout form (name, phone, address, notes), Place Order button

### Data fetched (server)
- `kitchens` — by slug, `notFound()` if missing
- `menu_items` — active items, ordered by category
- `feedback` — latest 6 with customer names
- `profiles` — checks if logged-in user is the owner (for dashboard button)

### Client state
- Cart (via CartContext / localStorage)
- Active category, search filter
- Favorites (localStorage per kitchen_id)
- Track order modal open/close + order lookup result
- Cart sheet open/close

### Design identity notes
- This is a **customer-facing public page** — not an admin tool
- Should feel like a clean, branded ordering experience
- Palette inherits from the kitchen owner's branding (currently unstyled per-kitchen)
- No sidebar, no admin chrome

---

## 5. Customer Order Tracking (`/[slug]/track`)

| Field | Value |
|---|---|
| **Route** | `/{slug}/track?order_id={uuid}` |
| **File** | `app/(customer)/[slug]/track/page.tsx` → `components/customer/OrderTracker.tsx` |
| **Access** | Public — anyone with the order UUID |
| **Tech** | Server Component + Client Component |

### What it shows
- Order progress timeline: Pending → Confirmed → Preparing → Ready/Dispatched → Delivered
- Current status highlighted
- Order items list with quantities and prices
- Order total
- Estimated time indicators

### Data fetched (server)
- Validates kitchen exists by slug
- Fetches order + nested `order_items` (with menu item names) by `order_id`
- `notFound()` if order doesn't belong to this kitchen

### Design identity notes
- Minimal, status-focused page
- No cart, no navigation — just the order state
- Accessible on any phone without an account

---

## 6. Customer Feedback (`/[slug]/feedback`)

| Field | Value |
|---|---|
| **Route** | `/{slug}/feedback?order_id={uuid}&kitchen={kitchen_id}` |
| **File** | `app/(customer)/[slug]/feedback/page.tsx` |
| **Access** | Public — linked from post-delivery message |
| **Tech** | Client Component |

### What it shows
- Centred card (max 480px)
- "How was your order?" heading
- **5-star rating** — large interactive stars, click to select
- Optional comments textarea (500 char limit)
- Submit button (disabled until rating selected)
- **Success state** — checkmark icon + "Thank You!" message

### Data & behaviour
- Reads `order_id` and `kitchen` from URL query params
- Shows invalid-link message if params missing
- POST to `/api/feedback` with `{order_id, kitchen_id, rating, comment}` on submit
- Success shown even if request fails (customer-friendly)

### Design identity notes
- Same centred card pattern as auth pages
- Very simple — one interaction (stars), one optional field
- No chrome, no navigation

---

## 7. Dashboard Overview (`/dashboard`)

| Field | Value |
|---|---|
| **Route** | `/dashboard` |
| **File** | `app/dashboard/page.tsx` |
| **Access** | Owner + Employee (both can view, owners see more) |
| **Tech** | Server Component, `revalidate: 0` |

### What it shows

**Top stats row (4 cards):**
| Card | Owner sees | Employee sees |
|---|---|---|
| Today's Revenue | Rs. amount + % vs yesterday | "---" hidden |
| Orders Today | count | count |
| Low Stock Items | count + "Action required" / "Inventory healthy" | count |
| Pending Approvals | count | "–" hidden |

**Two-column main section:**
- **Left (60%):** Recent Orders table — Order #, Customer, Total (owner only), Status badge — 6 rows
- **Right (40%):** Top Items Today — name, quantity sold, revenue bar (owner only), top 5

**Bottom section:**
- Live Orders table — all orders currently pending or preparing
  - Columns: Order #, Time Placed, Customer, Total (owner only), Status

### Data fetched
- Orders since PKT start-of-day (00:00 PKT = UTC-5) with customers + order_items + menu_items
- If owner: `notifications_log` count for pending approvals + low stock count

### Design identity notes
- The "home base" for both owners and employees
- Stat cards + data tables — dense but readable
- Owner vs employee experience differs significantly (revenue and approvals hidden from employees)

---

## 8. Dashboard Orders (`/dashboard/orders`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/orders` |
| **File** | `app/dashboard/orders/page.tsx` → `components/dashboard/OrderBoard.tsx` |
| **Access** | Owner + Employee |
| **Tech** | Server Component + Client Component |

### What it shows
- Page header: "Orders" title + search input + export button
- **OrderBoard** — interactive order list for today
  - Filterable by order number, customer name, status
  - Each row: Order #, time, customer name, phone, items, total, status badge
  - Inline status update (e.g. Pending → Confirmed → Preparing → Delivered)
  - Click to expand order details

### Data fetched
- All of today's orders (PKT timezone) with customers (name, phone, email) + order_items + menu item names

### Design identity notes
- Primary daily workflow for kitchen staff and owners
- Should be fast and scannable — high information density
- Status badges are the key interactive element

---

## 9. Dashboard Menu (`/dashboard/menu`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/menu` |
| **File** | `app/dashboard/menu/page.tsx` → `components/dashboard/MenuBoard.tsx` |
| **Access** | **Owner only** — employees see access-restricted message |
| **Tech** | Server Component + Client Component |

### What it shows (owner)
- **MenuBoard** — full menu management interface
  - Add new item button
  - Items grouped by category
  - Each item: image thumbnail, name, price, category, active/inactive toggle
  - Edit item modal: name, description, price, category, image upload, active toggle
  - Delete item (with confirm)
  - Manage categories

**If not owner:** Access restricted state with lock icon message.

### Data fetched
- All menu items for kitchen, ordered by category

### Design identity notes
- The "product catalog" for the kitchen
- Needs clear item cards and a good empty state for new kitchens
- Image upload and item toggle are key interactions

---

## 10. Dashboard Customers (`/dashboard/customers`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/customers` |
| **File** | `app/dashboard/customers/page.tsx` → `components/dashboard/CustomerBoard.tsx` |
| **Access** | Owner + Employee (via sidebar, no explicit restriction in code) |
| **Tech** | Server Component + Client Component |

### What it shows
- **CustomerBoard** — CRM table of all customers
  - Columns: Name, Phone, Email, Last Order Date, Total Orders, Lifetime Spend
  - Search/filter
  - Click row to see full history

### Data fetched
- Up to 100 customers for kitchen, ordered by `last_order_at` (most recent first)

### Design identity notes
- Simple data table — no complex interactions
- Key value is lifetime spend and repeat order patterns
- Sortable columns would be useful

---

## 11. Dashboard Reports (`/dashboard/reports`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/reports` |
| **File** | `app/dashboard/reports/page.tsx` |
| **Access** | **Owner only** — non-owners redirected to `/dashboard` |
| **Tech** | Server Component, `revalidate: 0` |

### What it shows
Four report cards in an auto-fit grid (min 400px per card):

1. **30-Day Revenue Trend** — bar chart, 30 daily columns, hover tooltips
2. **Top Selling Items** — table: Item Name / Units Sold / Revenue, top 10
3. **Customer Satisfaction** — large avg rating + star display + rating distribution bars (5★→1★)
4. **Stock Safety Margins** — table: Ingredient / Current Stock / Status (OK green / LOW amber / CRITICAL red)

**No data state:** Dashed-border empty box with message.

### Data fetched (30-day window)
- `orders` — delivered orders, nested `order_items` + `menu_items`
- `feedback` table — all ratings
- `ingredients` — all stock items by name

### Design identity notes
- Charts and tables — the most data-dense page in the app
- Owner's weekly review view, not a daily-use page
- Empty state is important (new kitchens with no history)

---

## 12. Dashboard Approvals (`/dashboard/approvals`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/approvals` |
| **File** | `app/dashboard/approvals/page.tsx` → `components/dashboard/ApprovalsBoard.tsx` |
| **Access** | **Owner only** — non-owners redirected to `/dashboard` |
| **Tech** | Server Component + Client Component |

### What it shows
- **ApprovalsBoard** — pending notifications requiring owner action
  - Each card: notification type badge, message, creation time, ingredient/item details
  - [Approve] and [Reject] action buttons
  - On approve: triggers `/api/approve` → n8n webhook → supplier WhatsApp message sent
  - On reject: dismisses the notification

### Data fetched
- `notifications_log` where `status = 'pending'`, ordered by newest first

### Design identity notes
- "Human-in-the-loop" automation page — the owner is the last checkpoint before automated actions fire
- Should feel like a triage inbox: clear action, clear consequence
- Approve button should feel deliberate (not easy to mis-tap)

---

## 13. Dashboard Settings (`/dashboard/settings`)

| Field | Value |
|---|---|
| **Route** | `/dashboard/settings` |
| **File** | `app/dashboard/settings/page.tsx` → `components/dashboard/SettingsForm.tsx` |
| **Access** | **Owner only** — non-owners redirected to `/dashboard` |
| **Tech** | Server Component + Client Component |

### What it shows
- **SettingsForm** — kitchen profile editor
  - Kitchen name
  - Email address
  - Phone number
  - City / location
  - Notification channel (email / WhatsApp)
  - Storefront slug preview
- Save changes button

### Data fetched
- `kitchens` record for user's kitchen

### Design identity notes
- Standard settings/profile form
- Low-traffic page — owners visit once to set up, rarely after
- Incomplete settings trigger the `ProfileBanner` warning in the dashboard header

---

## 14. Kitchen Display System (`/kitchen`)

| Field | Value |
|---|---|
| **Route** | `/kitchen` |
| **File** | `app/kitchen/page.tsx` → `components/kitchen/OrderGrid.tsx` |
| **Access** | Owner + Employee |
| **Tech** | Server Component + Client Component |
| **Layout** | Full-screen dark theme (separate from dashboard layout) |

### What it shows
- **OrderGrid** — large-format KDS (Kitchen Display System)
  - Order cards in columns by status: Pending / Confirmed / Preparing / Ready
  - Each card: Order #, customer name, items with quantities, time elapsed, status controls
  - Large touch-friendly buttons for tablets
  - Audio ping on new orders
  - Visual highlight for old/overdue orders
  - Real-time updates (polling or websocket)

### Data fetched
- All of today's orders (PKT timezone, FIFO order)
- Full nested: customers + order_items + menu items

### Design identity notes
- **Completely different visual language** from the dashboard — dark background (`#000000`), high contrast, large text
- Designed for a 10" tablet mounted in the kitchen
- No sidebar, minimal chrome — maximum space for order cards
- Speed and legibility under stress are the only metrics that matter

---

## 15. Kitchen Wastage Log (`/kitchen/wastage`)

| Field | Value |
|---|---|
| **Route** | `/kitchen/wastage` |
| **File** | `app/kitchen/wastage/page.tsx` → `components/kitchen/WastageForm.tsx` |
| **Access** | Owner + Employee |
| **Tech** | Server Component + Client Component |
| **Layout** | Dark KDS layout (same as `/kitchen`) |

### What it shows
- **WastageForm** — log ingredient wastage
  - Ingredient selector (dropdown/autocomplete from all kitchen ingredients)
  - Quantity field + unit
  - Reason dropdown: spoilage / overstock / accident / other
  - Timestamp (auto-populated, editable)
  - Submit button
  - Success confirmation after submit

### Data fetched
- All ingredients for kitchen, ordered by name

### Design identity notes
- Dark KDS aesthetic (consistent with `/kitchen`)
- Simple single-purpose form — quick to fill, minimal friction
- Staff use this while still in kitchen context

---

## 16. Shared Layouts

### Root Layout (`app/layout.tsx`)
- Sets global fonts: DM Serif Display (via Google Fonts), Geist Sans, Geist Mono
- Wraps all pages — minimal, just font variables and metadata

### Customer Layout (`app/(customer)/layout.tsx`)
- Wraps all `/[slug]/*` routes
- Provides `CartProvider` context (cart state persisted to localStorage)

### Dashboard Layout (`app/dashboard/layout.tsx`)
- **Auth guard** — redirects to `/login` if not authenticated or not owner/employee
- **Sidebar** — floating pill sidebar (68px collapsed, 220px expanded on hover)
  - Nav items filtered by role (employees: Dashboard + Orders only)
  - Pending approvals badge
  - Avatar dropdown (profile, settings, sign out)
- **ProfileBanner** — appears if kitchen is missing city or phone
- Dynamic main content margin (92px/244px) tracks sidebar state

### Kitchen Layout (`app/kitchen/layout.tsx`)
- **Auth guard** — same as dashboard
- **Full-screen dark theme** — black background, no scrollbar, `100dvh`
  - CSS variables: `--kds-bg: #000`, `--kds-surface: #1A1A1A`, `--kds-text: #FFF`
- **KitchenNav** — minimal header with kitchen name, role badge, user name

---

## Access Control Summary

| Page | Owner | Employee | Anonymous |
|---|---|---|---|
| Landing `/` | ✓ | ✓ | ✓ |
| Login / Signup | ✓ | ✓ | ✓ |
| Storefront `/[slug]` | ✓ | ✓ | ✓ |
| Order Tracking | ✓ | ✓ | ✓ |
| Feedback | ✓ | ✓ | ✓ |
| Dashboard Overview | ✓ | ✓ (limited) | ✗ |
| Orders | ✓ | ✓ | ✗ |
| Menu | ✓ | ✗ | ✗ |
| Customers | ✓ | ✓ | ✗ |
| Reports | ✓ | ✗ | ✗ |
| Approvals | ✓ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✗ |
| Kitchen Queue | ✓ | ✓ | ✗ |
| Wastage Log | ✓ | ✓ | ✗ |

---

## Data Model (Referenced Across Pages)

| Table | Key Fields | Used By |
|---|---|---|
| `kitchens` | `kitchen_id`, `name`, `slug`, `email`, `phone`, `city`, `settings` | All pages |
| `profiles` | `user_id`, `kitchen_id`, `role` (owner/employee), `name` | Auth, layouts |
| `menu_items` | `item_id`, `kitchen_id`, `name`, `price`, `category`, `is_active`, `image_url` | Storefront, Menu, Orders |
| `orders` | `order_id`, `kitchen_id`, `customer_id`, `status`, `total_amount`, `created_at` | Orders, Dashboard, Kitchen |
| `order_items` | `order_id`, `item_id`, `quantity`, `unit_price` | Orders, Reports, Tracking |
| `customers` | `customer_id`, `kitchen_id`, `name`, `phone`, `email`, `total_orders`, `total_spend` | Customers, CartSheet |
| `feedback` | `feedback_id`, `kitchen_id`, `order_id`, `rating`, `comment` | Storefront, Reports |
| `notifications_log` | `id`, `kitchen_id`, `type`, `status`, `message`, `created_at` | Approvals, Sidebar badge |
| `ingredients` | `ingredient_id`, `kitchen_id`, `name`, `current_stock`, `unit` | Reports, Wastage |
