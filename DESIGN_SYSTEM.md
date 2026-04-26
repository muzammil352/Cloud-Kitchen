# KitchenOS — Full Application Design System
# Apply this design identity uniformly across every page 
# and component in the app.

This document is the single source of truth for visual design. 
Read it in full before touching any page. Every decision here 
has been made deliberately — do not substitute alternatives.

---

## 0. THE PRODUCT & ITS SURFACES

KitchenOS is an operations platform for cloud kitchen owners 
in Pakistan. It has four distinct visual surfaces, each 
serving a different user in a different context:

Surface A — MARKETING (Landing page)
  Who: Prospective owners browsing the product
  Context: Desktop browser, unhurried, evaluating
  Tone: Confident, editorial, ambitious

Surface B — AUTH (Login, Signup)
  Who: Owners creating an account or returning
  Context: Any device, focused task, low friction
  Tone: Clean, trustworthy, calm

Surface C — DASHBOARD (Owner + Employee views)
  Who: Kitchen owners and their staff on desktop/laptop
  Context: Daily operational use, high information density
  Tone: Professional, dense, scannable

Surface D — CUSTOMER (Storefront, Tracking, Feedback)
  Who: Customers placing and tracking orders
  Context: Mobile phone, usually on the move
  Tone: Friendly, clear, touch-first

Surface E — KITCHEN DISPLAY SYSTEM (Queue, Wastage)
  Who: Kitchen staff — cooks, runners
  Context: 10" Android tablet mounted in the kitchen, 
           bright ambient light, hands busy
  Tone: Dark, high-contrast, zero chrome

These surfaces share one design language but differ in 
brightness, density, and interaction style. The rules below 
define the shared language first, then specify per-surface 
overrides.

---

## 1. DESIGN PHILOSOPHY

Build an operations room, not a restaurant. Every screen 
should feel like a precision instrument — nothing decorative 
that does not carry information. The product earns trust 
through clarity, not through visual flair.

Three principles that override everything else:
1. LEGIBILITY FIRST — if it cannot be read instantly, 
   remove the decoration until it can
2. STATUS IS ALWAYS VISIBLE — every screen shows the 
   user exactly where things stand, right now
3. ONE ACTION PER MOMENT — each screen should have 
   one obvious next step; secondary actions are secondary

---

## 2. GLOBAL DESIGN TOKENS

### 2.1 Color Palette — "Karachi Concrete"

```css
/* Light surfaces (Dashboard, Auth, Customer) */
--color-bg:         #F5F2ED;  /* Warm plaster — main background */
--color-surface:    #FFFFFF;  /* Card/panel surfaces */
--color-surface-2:  #F0EDE8;  /* Slightly darker surface (sidebar, 
                                  nested panels) */
--color-border:     rgba(26, 25, 23, 0.08);  /* Subtle dividers */
--color-border-mid: rgba(26, 25, 23, 0.15);  /* Hover/active borders */

--color-ink:        #1A1917;  /* Primary text — near-black, warm */
--color-ink-2:      #4A4741;  /* Secondary text */
--color-ink-3:      #7A746D;  /* Muted/caption text */

--color-accent:     #D4531A;  /* Burnt saffron — ALL primary CTAs, 
                                  active states, key highlights */
--color-accent-bg:  rgba(212, 83, 26, 0.08);  /* Accent tinted background */
--color-accent-dark:#A83D10;  /* Accent hover/pressed state */

--color-green:      #2D7A4F;  /* Confirmed, delivered, stock OK */
--color-green-bg:   rgba(45, 122, 79, 0.08);
--color-amber:      #C47A1E;  /* Pending, low stock warning */
--color-amber-bg:   rgba(196, 122, 30, 0.08);
--color-red:        #C0392B;  /* Cancelled, critical stock, errors */
--color-red-bg:     rgba(192, 57, 43, 0.08);
--color-blue:       #2563EB;  /* Informational, links */
--color-blue-bg:    rgba(37, 99, 235, 0.08);

/* Dark surfaces (KDS only) */
--kds-bg:           #0D0D0D;
--kds-surface:      #1A1A1A;
--kds-surface-2:    #252525;
--kds-border:       rgba(255, 255, 255, 0.08);
--kds-border-mid:   rgba(255, 255, 255, 0.15);
--kds-ink:          #F0EDE8;
--kds-ink-2:        #B0ADA8;
--kds-ink-3:        #7A7772;
/* Accent and status colors remain IDENTICAL on dark surface 
   — same hex values, no muted versions */
```

### 2.2 Typography

```css
/* Typefaces — load all three via Google Fonts */
@import url('https://fonts.googleapis.com/css2?
  family=Fraunces:opsz,ital,wght@9..144,0,400;
         9..144,1,400;
         9..144,0,600&
  family=DM+Sans:wght@400;500;600&
  family=JetBrains+Mono:wght@400;500&
  display=swap');

--font-display:  'Fraunces', Georgia, serif;
--font-body:     'DM Sans', system-ui, sans-serif;
--font-mono:     'JetBrains Mono', 'Courier New', monospace;

/* Type scale */
--text-xs:    11px;  /* Micro labels, overlines */
--text-sm:    13px;  /* Table cells, captions, status badges */
--text-base:  15px;  /* Body copy, form fields */
--text-md:    17px;  /* Card titles, section intros */
--text-lg:    21px;  /* Page headings */
--text-xl:    26px;  /* Section headings */
--text-2xl:   34px;  /* Hero sub-headings */
--text-3xl:   48px;  /* Hero primary line */
--text-4xl:   68px;  /* Landing display headline */

/* Weight usage */
/* 400: body copy, labels, descriptions */
/* 500: headings, nav items, button labels, stat values */
/* 600: Fraunces display headings only */

/* Line height */
--leading-tight:  1.15;  /* Display headlines */
--leading-snug:   1.3;   /* Card/section headings */
--leading-base:   1.55;  /* Body copy */
--leading-loose:  1.8;   /* Descriptive paragraphs */

/* Tracking */
--tracking-tight: -0.03em;   /* Display headlines */
--tracking-normal: 0;        /* Body */
--tracking-wide:  0.08em;    /* Overlines, mono labels, small caps */
--tracking-wider: 0.12em;    /* ALL CAPS status badges */
```

### 2.3 Spacing

```
/* 4px base grid. All padding/margin/gap values are multiples of 4 */
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
```

### 2.4 Border Radius

```css
--radius-sm:   4px;   /* Badges, status pills */
--radius-md:   8px;   /* Inputs, small cards */
--radius-lg:   12px;  /* Main cards, panels */
--radius-xl:   16px;  /* Modals, large cards */
--radius-2xl:  24px;  /* Hero mockup frame, feature cards */
--radius-pill: 9999px; /* CTA buttons, nav pills, tags */
```

### 2.5 Shadows

```css
--shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 
              0 1px 2px rgba(0,0,0,0.04);
--shadow-md:  0 4px 12px rgba(0,0,0,0.07), 
              0 2px 4px rgba(0,0,0,0.04);
--shadow-lg:  0 12px 32px rgba(0,0,0,0.09), 
              0 4px 8px rgba(0,0,0,0.04);
--shadow-accent: 0 4px 16px rgba(212, 83, 26, 0.22);
```

### 2.6 Texture & Atmosphere

Every light-surface page carries three passive background layers.
Apply these at the `<body>` or root layout level — never repeat 
them on individual cards:

**LAYER 1 — SVG noise grain (always on):**
Apply via CSS filter or inline SVG feTurbulence over the 
background. baseFrequency: 0.65, numOctaves: 3, opacity: 0.025.
Creates an analogue-paper tactility that prevents flat digital 
sterility.

**LAYER 2 — Drafting grid (dashboard and landing only):**
```css
background:
  repeating-linear-gradient(
    rgba(26,25,23,0.04) 0px, 
    transparent 1px
  ) 0 0 / 80px 80px,
  repeating-linear-gradient(
    90deg, 
    rgba(26,25,23,0.04) 0px, 
    transparent 1px
  ) 0 0 / 80px 80px;
```
Masked with radial-gradient to fade at edges.

**LAYER 3 — Background word (landing hero only):**
"KITCHEN" in Fraunces, 20vw size, letter-spacing 0.3em, 
opacity: 0.015, centered behind hero content. 
Parallax: moves at 30% of scroll speed.

**DO NOT apply grain or grid to:**
- KDS pages (dark surface)
- Customer storefront (use kitchen's brand colour instead)
- Auth pages (keep completely clean)

---

## 3. GLOBAL COMPONENT LIBRARY

These components appear across multiple pages and must look 
identical everywhere. Define them once.

### 3.1 Status Badge
Used across: Orders, Dashboard, Customer tracking, KDS

Rules:
- Always pill-shaped (`border-radius: --radius-pill`)
- Font: JetBrains Mono, 11px, letter-spacing 0.12em, uppercase
- Padding: 3px 8px
- Never use a coloured background with black text — always 
  use the semantic text color from the same family

| Status | Background | Text |
|---|---|---|
| `pending` | `--color-amber-bg` | `--color-amber` |
| `confirmed` | `rgba(37,99,235,0.08)` | `--color-blue` |
| `preparing` | `--color-accent-bg` | `--color-accent` |
| `out_for_delivery` | `rgba(45,122,79,0.12)` | `--color-green` |
| `delivered` | `--color-green-bg` | `--color-green` |
| `cancelled` | `--color-red-bg` | `--color-red` |

On dark KDS surface:
- Same pill structure
- Background opacity increased to 0.18 for visibility
- Text colors identical (status colour consistency across surfaces)

### 3.2 Button

**Primary CTA:**
```css
bg: --color-accent
text: #FFFFFF
border-radius: --radius-pill
padding: 10px 20px
font: DM Sans 500, 14px
box-shadow: --shadow-accent
hover: bg → --color-accent-dark, translateY(-1px)
active: translateY(0), shadow reduced
```

**Secondary (Ghost):**
```css
bg: transparent
border: 1px solid --color-border-mid
text: --color-ink
hover: bg → --color-surface-2
```

**Destructive:**
```css
bg: --color-red-bg
text: --color-red
border: 1px solid rgba(192,57,43,0.2)
hover: bg → rgba(192,57,43,0.14)
```

On dark KDS surface:
- Primary: same `--color-accent` (never invert to white)
- Ghost: border `rgba(255,255,255,0.15)`, text `--kds-ink`

### 3.3 Input Field

```css
background: --color-surface
border: 1px solid --color-border-mid
border-radius: --radius-md
padding: 10px 14px
font: DM Sans 400, 15px, --color-ink
placeholder: --color-ink-3

focus:
  border-color: --color-accent
  box-shadow: 0 0 0 3px rgba(212,83,26,0.12)
  outline: none

error:
  border-color: --color-red
  box-shadow: 0 0 0 3px rgba(192,57,43,0.10)
```

Label above input: DM Sans 500, 13px, `--color-ink-2`, margin-bottom: 6px

### 3.4 Card

**Standard content card:**
```css
background: --color-surface
border: 1px solid --color-border
border-radius: --radius-lg
padding: --space-6
box-shadow: --shadow-sm

hover (when interactive):
  box-shadow: --shadow-md
  border-color: --color-border-mid
  transition: 200ms ease
```

**Featured/elevated card** (e.g. pricing middle tier):
```css
border: 1.5px solid --color-accent
box-shadow: --shadow-accent
```

### 3.5 Table

```css
thead:
  background: --color-surface-2
  font: DM Sans 500, 12px, --color-ink-3
  letter-spacing: 0.08em
  text-transform: uppercase
  border-bottom: 1px solid --color-border-mid
  th padding: 10px 16px

tbody tr:
  border-bottom: 1px solid --color-border
  font: DM Sans 400, 14px, --color-ink
  td padding: 12px 16px
  hover: background rgba(212,83,26,0.03)

/* Data columns (numbers, IDs, prices) */
font-family: --font-mono
font-size: 13px
```

### 3.6 Empty State

Used when a table/section has no data yet:
- Centered in the container
- 48px icon (Lucide, `--color-ink-3` stroke)
- 16px heading, DM Sans 500, `--color-ink-2`
- 13px body, DM Sans 400, `--color-ink-3`
- Optional: primary CTA button below
- Dashed 1.5px border, `--color-border`, `--radius-lg`, padding `--space-10`

### 3.7 Toast / Alert

- Fixed bottom-right, z-index: 9999
- Border-radius: `--radius-lg`
- Width: 320px
- Left border accent: 4px solid [semantic color]
- Background: `--color-surface`
- Shadow: `--shadow-lg`
- Title: DM Sans 500, 14px
- Body: DM Sans 400, 13px, `--color-ink-2`
- Auto-dismiss: 4 seconds
- Slides in from right, fades out

---

## 4. SURFACE SPECIFICATIONS

### SURFACE B — AUTH PAGES (`/login`, `/signup`)

**Layout:**
- Full viewport centred column. No sidebar, no nav.
- Vertical stack: logo → card → footer link
- Desktop: max-width 420px card, vertically centred with 10vh top padding
- Mobile: card fills width with 24px horizontal padding

**Background:**
- `--color-bg` (warm plaster)
- Grain overlay ON, grid OFF
- NO decorative imagery

**Logo:**
- "KitchenOS" wordmark
- Font: Fraunces 600, 22px, `--color-ink`
- "Kitchen" in regular weight, "OS" in accent color
- Centered above the card

**Auth Card:**
- Standard card component (see 3.4), padding: 36px
- No box-shadow on mobile — becomes full-width

**Form heading:**
- DM Sans 500, 22px, `--color-ink`
- Subtitle: DM Sans 400, 14px, `--color-ink-3`
- Margin below: 28px

**Error state:**
- 4px left border, `--color-red`
- background: `--color-red-bg`
- border-radius: `--radius-md`
- padding: 10px 14px
- font: DM Sans 400, 13px, `--color-red`
- Icon: AlertCircle (Lucide), 15px, same color
- Displayed ABOVE the submit button, fades in

**`/signup` specific — Password strength bar:**
- 4-segment track below password input
- Height: 3px, border-radius: 2px
- Background: `--color-border-mid` (empty segments)
- Filled segments progress left to right:
  - 1 segment: `--color-red` (Weak)
  - 2 segments: `--color-amber` (Fair)
  - 3 segments: `--color-accent` (Good)
  - 4 segments: `--color-green` (Strong)
- Label (13px, DM Sans 400) appears right-aligned beside track in matching colour

**Footer link:**
- Centered below card
- DM Sans 400, 13px, `--color-ink-3`
- Inline link: `--color-accent`, no underline, underline on hover

---

### SURFACE C — DASHBOARD (all `/dashboard/*` routes)

#### Dashboard Layout

**Sidebar:**
```
Position: Fixed left
Width: 68px (collapsed) → 220px (on hover/active)
Height: 100vh
Background: --color-surface
Border-right: 1px solid --color-border
Transition: width 200ms ease
z-index: 100
```

**Logo area (top):**
- Height: 64px
- "KOS" monogram when collapsed (Fraunces 600, 18px, accent colour, centered)
- "KitchenOS" when expanded (same font, full wordmark)

**Nav items:**
- Height: 44px per item, padding: 0 16px
- Icon (20px, Lucide) always visible
- Label (DM Sans 500, 14px) visible only when expanded
- Active item: background `--color-accent-bg`, text/icon `--color-accent`, left border 3px solid `--color-accent`
- Hover (inactive): background `--color-surface-2`

**Role-based nav items:**
- Owner: Dashboard, Orders, Menu, Customers, Reports, Approvals, Settings
- Employee: Dashboard, Orders only
- Items the role cannot access: **hidden entirely** — never show locked/greyed items

**Pending approvals badge:**
- On the Approvals nav item
- Small red dot (8px, `--color-red`) top-right of icon
- Visible when count > 0 and user is owner

**Bottom section:**
- Avatar circle (32px, DM Sans 500, initials, `--color-accent-bg` background, `--color-accent` text)
- On click: dropdown with "Profile" / "Settings" / "Sign out"

**Main content area:**
- Margin-left: 68px normally → 220px when sidebar expanded
- Transition: margin-left 200ms ease
- Padding: 32px

**ProfileBanner** (when `kitchen.phone` OR `kitchen.city` is null):
- Full-width bar at top of main content
- Background: `--color-amber-bg`
- Border-bottom: 1px solid `rgba(196,122,30,0.2)`
- Padding: 12px 32px
- Content: amber AlertCircle icon + message + "Go to Settings →" link in `--color-amber`

**Page header pattern (all dashboard pages):**
- Title: DM Sans 500, 22px, `--color-ink`
- Subtitle (when present): DM Sans 400, 14px, `--color-ink-3`
- Right side: action buttons
- Margin-bottom: 24px

---

#### Dashboard — Overview (`/dashboard`)

**Stat cards (4 across):**
- Label: DM Sans 500, 11px, `--color-ink-3`, letter-spacing 0.1em, uppercase
- Value: **Fraunces 600, 32px**, `--color-ink` (Fraunces makes numbers feel weighty and operational)
- Sub-line: DM Sans 400, 12px
  - Positive change: `--color-green` + ↑ prefix
  - Negative change: `--color-red` + ↓ prefix
  - Neutral: `--color-ink-3`
- Icon: 20px Lucide, top-right of card, `--color-ink-3`

Revenue card (employee): value shows "—", blurred overlay `filter: blur(4px)`, sub-line "Not available for your role"

Low stock card: `border-left: 3px solid --color-amber` if count > 0, else `--color-green`

Pending approvals (owner only): `border-left: 3px solid --color-red` + value in `--color-red` if count > 0

**Main content (two columns, 60/40):**
- Left: Recent Orders mini-table (6 rows) + "View all orders →" link in `--color-accent`
- Right: Top Items Today — name + units + relative volume bar (height 4px, `--color-accent` fill)

**Bottom — Live Orders:**
- Full-width table of all pending/preparing orders
- Pulsing green dot beside "Live Orders" heading
- Real-time updates (polling 30s or Supabase Realtime)

---

#### Dashboard — Orders (`/dashboard/orders`)

**Page header:**
- Left: "Orders" title + today's date in JetBrains Mono, 13px, `--color-ink-3`
- Right: Search input (280px) + Export button (ghost)

**Order table columns:** Order # | Time | Customer | Items | Total | Status

- Order #: JetBrains Mono, 13px
- Time: JetBrains Mono, 12px, `--color-ink-3`
- Items: comma-separated, truncated at 40 chars
- Total (owner only): JetBrains Mono 500, 13px
- Status: badge component (see 3.1)

**Row click → inline detail panel:**
- Background: `--color-surface-2`
- Full item list with quantities and unit prices
- Delivery address, notes, customer phone
- Status update: owner can advance to any state, employee can advance pending→confirmed→preparing→out_for_delivery; only owner can mark delivered or cancel

---

#### Dashboard — Menu (`/dashboard/menu`)

**Access guard:** Non-owner sees centred empty state with LockKeyhole icon. No further content.

**Owner sees:**
- Top bar: "Menu" title + "Add item" button (primary)
- Items grouped by category header (DM Sans 500, 13px, uppercase, `--color-ink-3`)

**Item card (horizontal):**
- Left: 48×48 image (`--radius-md`, object-fit: cover) or placeholder with ImageIcon
- Middle: Name (DM Sans 500, 15px) + Category pill (11px) + Description (12px, 1 line)
- Right: Price (JetBrains Mono 500, 15px) + Active toggle + Edit icon + Delete icon

**Active toggle:**
- Off: background `--color-border-mid`
- On: background `--color-accent`
- Width: 36px, height: 20px, pill shape
- Item card at `opacity: 0.55` when `is_active: false`

**Add/Edit modal:**
- max-width: 560px, `--radius-xl`, backdrop `rgba(26,25,23,0.4)`
- Fields: Name, Description, Price (with "Rs." prefix), Category, Active toggle
- Image upload: dashed border drop zone

---

#### Dashboard — Customers (`/dashboard/customers`)

**Top bar:** "Customers" title + JetBrains Mono count + search input

**Table columns:** Customer | Phone | Last Order | Orders | Spend

- Customer cell: name (500) + email below (12px, `--color-ink-3`)
- Phone: JetBrains Mono, 13px
- Last Order: JetBrains Mono, 12px, `--color-ink-3`, relative time ("2 days ago")
- Orders: JetBrains Mono, 13px, centered
- Spend (owner only): JetBrains Mono 500, 13px, "Rs. X,XXX" format

**Row click → detail panel slides in from right (320px):**
- Customer name + avatar initial circle
- All contact info
- Order history: last 10 orders in mini-table
- Total spend, lifetime order count in stat mini-cards

---

#### Dashboard — Reports (`/dashboard/reports`)

Access guard: Non-owner redirected to `/dashboard`.

All 4 report cards in auto-fit grid (min 380px):

**Card 1 — 30-Day Revenue Trend:**
- 240px tall chart container
- Bars: today in `--color-accent`, rest in `rgba(212,83,26,0.25)`
- Hover: bar brightens + tooltip (white card, shadow-md, date + Rs. amount)
- X-axis: "1", "10", "20", "30" in JetBrains Mono, 10px, `--color-ink-3`
- No visible Y-axis lines

**Card 2 — Top Selling Items:**
- Columns: Item | Units | Revenue
- Rank number left: JetBrains Mono, 11px, `--color-ink-3` ("01", "02", …)
- Category pill (11px) beside item name

**Card 3 — Customer Satisfaction:**
- Average rating: Fraunces 600, 52px + "/ 5.0" suffix in 24px, `--color-ink-3`
- Stars: filled to avg, `--color-amber` fill, partial fill for fractions
- Distribution bars 5★→1★: same bar pattern, `--color-amber` fill

**Card 4 — Stock Safety Margins:**
- Columns: Ingredient | Current Stock | Status
- Status badges: OK (green) / LOW (amber) / CRITICAL (red)

**No data state per card:** Dashed border empty state (see 3.6), "No data for this period yet."

---

#### Dashboard — Approvals (`/dashboard/approvals`)

Access guard: Non-owner redirected to `/dashboard`.

**Page subheading:** "Actions pending your review before automation fires. Approve to execute, reject to dismiss." — 14px, DM Sans 400, `--color-ink-3`

**Approval card:**
- Left border 4px solid:
  - `low_stock`: `--color-amber`
  - `win_back`: `--color-blue`
  - `upsell`: `--color-accent`
- Header row: type badge + "— N minutes ago" (12px JetBrains Mono)
- Body: main message (15px) + detail line with mono numbers (13px)
- Supplier info for low_stock: "Message will be sent to [Name] at [Phone]"

**Action row (right-aligned):**
- Reject: ghost button, smaller
- Approve: primary button
- On click: immediately disabled
- After action: card fades out + collapses height to 0 over 300ms, then removed

**Empty state:** CheckCircle icon, `--color-green`, "No pending approvals — all systems running."

---

#### Dashboard — Settings (`/dashboard/settings`)

Standard card, max-width 640px.

**Section heading pattern:** DM Sans 500, 13px, `--color-ink-3`, uppercase, letter-spacing 0.1em + divider below

**Sections:**
- "KITCHEN PROFILE" — Name, Email, Phone, City
- "NOTIFICATIONS" — 3-option segmented control (not a dropdown)
- "STOREFRONT" — Slug preview (read-only)

**Notification channel segmented control:**
- Options: [Email only] [WhatsApp only] [Both]
- Active: background `--color-accent`, text white
- Inactive: transparent, text `--color-ink-2`
- Container: 1px border, `--radius-md`, segments share borders (no gap)

**Slug preview:**
- Read-only input with Lock icon in left padding
- Below: full URL in JetBrains Mono, 13px + CopyIcon button

**Save button:** primary, right-aligned. After save: green success toast (see 3.7)

---

### SURFACE D — CUSTOMER PAGES

Design principle: This is the kitchen's public face. It should feel warm, clean, and native on a phone. No dashboard chrome, no admin visual language.

#### Customer Storefront (`/[slug]`)

**Background:**
- Top 200px: kitchen's accent colour. Gradient fading to white below.
- NO grain, NO grid.

**Header bar:**
- Height: 64px, background: kitchen accent colour
- Kitchen name: DM Sans 500, 18px, white
- Right: Cart icon (24px) + count badge (12px circle, white bg, accent text)
- If owner logged in: small ghost "← Dashboard" button on left

**Category tabs:**
- Horizontal scrollable, no visible scrollbar
- Active: solid kitchen accent, white text, pill shape
- Inactive: transparent, `--color-ink-2`
- Sticks below header on scroll

**Menu item card:**
- Image: 16:9 aspect, top, `--radius-lg` top corners. No image: `--color-surface-2` + ImageIcon centered
- Name: DM Sans 500, 15px
- Description: 13px, `--color-ink-3`, 2 lines max, overflow ellipsis
- Price: JetBrains Mono 500, 16px, `--color-ink`
- Add button: pill "Add" in accent when no quantity
- When quantity > 0: `[–] [n] [+]` control, height 32px, `--color-accent-bg` background, `--color-accent` buttons, JetBrains Mono 500 count
- Heart/favourite: top-right absolute, outline → filled accent when active

**Sticky bottom bar (mobile, when cart has items):**
- Fixed bottom: 0, full-width
- Background: `--color-accent`
- "View Cart (n) — Rs. X,XXX" white DM Sans 500
- Height: 56px

**Cart sheet:**
- Slides from bottom on mobile, right on desktop
- Item rows: name (500) + quantity control + line total (mono)
- Checkout form: standard input components
- Place Order button: full-width primary, spinner on loading

**Reviews section:**
- "What customers say" — DM Sans 500, 17px
- Review cards: 3-col desktop, 1-col mobile
- Stars: `--color-amber`, 14px
- Customer name + date: 12px, `--color-ink-3`

---

#### Customer Order Tracking (`/[slug]/track`)

Background: clean white, no grain, no grid. Max-width: 520px, centred.

**Progress timeline (vertical, centred):**
- Completed step: 32px circle, `--color-green` fill, check icon, white
- Active step: `--color-accent` fill, white icon, pulsing ring (scale 1→1.3→1, opacity 1→0, 2s loop)
- Upcoming step: white fill, grey border, grey icon
- Connector line: `--color-green` solid (completed) / `--color-border-mid` dashed (upcoming)
- Step label: DM Sans 500, 14px, `--color-ink` (active) / `--color-ink-3` (upcoming)

**Order items list:** standard bordered list, name + quantity (mono) + price (mono)

**Footer:** "Having issues? Contact [Kitchen Phone]" — 13px, `--color-ink-3`, phone as `tel:` link

---

#### Customer Feedback (`/[slug]/feedback`)

Background: `--color-bg`, clean. Max-width: 440px, centred, vertically centred in viewport.

**Card:**
- Kitchen name at top: 16px DM Sans 500, `--color-ink-3`
- Heading: "How was your order?" — Fraunces 600, 26px, `--color-ink`

**Star rating:**
- 5 stars, 40px each, 44×44 touch targets
- Outline: `--color-ink-3`. Hover/selected: `--color-amber` fill
- Rating label below: 1: "Not good" / 2: "Below average" / 3: "OK" / 4: "Good" / 5: "Excellent!" — DM Sans 400, 13px, `--color-ink-3`

**Comment textarea:** full-width, 4 rows. Char counter: "240/500" right-aligned, 11px mono.

**Success state (replaces form):**
- CheckCircle icon (40px, `--color-green`)
- "Thank you!" — Fraunces 600, 24px
- "Your feedback helps us get better." — 14px muted
- No redirect

---

### SURFACE E — KITCHEN DISPLAY SYSTEM (`/kitchen`)

Design principle: Designed exclusively for a 10" tablet in a loud, bright kitchen. Every element is oversized. Every important piece of information is visible from 2 metres away. No hover effects (touch only). No decorative elements whatsoever.

**Global KDS CSS variable overrides:**
```css
body { background: var(--kds-bg); }
/* All --color-* surfaces replaced with --kds-* */
```

**KDS font size overrides (larger than dashboard):**
```
--kds-text-order-id:  14px JetBrains Mono
--kds-text-items:     20px DM Sans 500
--kds-text-customer:  16px DM Sans 400
--kds-text-time:      13px JetBrains Mono
```

**KDS Navigation bar:**
- Height: 56px, background: `--kds-surface`, border-bottom: 1px `--kds-border`
- Left: kitchen name — DM Sans 500, 16px, `--kds-ink`
- Right: user name + role badge ("OWNER" in `--color-accent` pill / "STAFF" in grey) + time

---

#### Kitchen Queue (`/kitchen`)

**4-column layout:** Pending | Confirmed | Preparing | Ready

Column header: DM Sans 500, 13px, `--kds-ink-3`, uppercase, letter-spacing 0.12em

Count badge colors: Pending → amber / Confirmed → blue / Preparing → accent / Ready → green

**Order ticket:**
```css
background: --kds-surface
border: 1px solid --kds-border
border-top: 3px solid [status colour]
border-radius: --radius-lg
padding: 16px
margin-bottom: 12px
```

- Order number: JetBrains Mono 500, 13px, `--kds-ink-3`
- Customer name: DM Sans 500, 18px, `--kds-ink`
- Item list: DM Sans 500, 16px + quantity in JetBrains Mono, 16px, `--color-accent` with "×" prefix
  - e.g. "×2  Chicken Burger"
- Notes (if present): italic, 13px, `--kds-ink-2`, amber note icon
- Time elapsed:
  - 0–10min: `--kds-ink-3`
  - 10–20min: `--color-amber`
  - 20min+: `--color-red`, bold, pulsing animation
- Overdue card: background `rgba(192,57,43,0.08)`, border-top `--color-red`

**Action button (advance to next state):**
- Full-width, height: 48px (touch-friendly)
- Label is always the NEXT ACTION, never the current status:
  - "Confirm Order" (pending → confirmed)
  - "Start Preparing" (confirmed → preparing)
  - "Mark Ready" (preparing → ready)
- Background: [next state colour]

**Audio:** 1046Hz sine wave, 200ms on new order INSERT. First-use tap-to-enable overlay required.

---

#### Kitchen Wastage Log (`/kitchen/wastage`)

Same dark KDS surface. Single-column centred form, max-width: 560px.

- Heading: "Log Wastage" — DM Sans 500, 22px, `--kds-ink`
- Ingredient field: searchable dropdown, shows name + current stock right-aligned in JetBrains Mono
- Quantity field: number input + unit label. Max: `current_stock`. Shake animation on exceeded.
- Reason dropdown: Spoilage / Overstock / Accident / Other
- Timestamp: auto-filled to `now()`, editable. JetBrains Mono, 14px, `--kds-ink-2`
- Submit button: primary, full-width
- Success: inline CheckCircle + "Logged: 0.5 kg Chicken Breast — Spoilage". Form resets after 2s.

---

## 5. MOTION & ANIMATION STANDARDS

### 5.1 Duration & Easing

```css
--duration-instant:  80ms;   /* Button press feedback */
--duration-fast:     150ms;  /* Hover state transitions */
--duration-base:     220ms;  /* Default transitions */
--duration-moderate: 350ms;  /* Panel slides, modals */
--duration-slow:     500ms;  /* Page-level entrances */

--ease-standard:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-enter:       cubic-bezier(0.0, 0.0, 0.2, 1.0);
--ease-exit:        cubic-bezier(0.4, 0.0, 1.0, 1.0);
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1.0);
```

### 5.2 Rules

- Animate only: `opacity`, `transform` (translate, scale), `max-height`. Never animate `width`, `height`, `padding`, or `border` directly — causes layout thrashing.
- **KDS pages: NO animation** except the overdue pulse and the audio enable overlay.
- Reduced motion: all animations must respect `@media (prefers-reduced-motion: no-preference)`.
- Hover effects only on pointer: coarse devices (tablets/phones) must never trigger hover state changes.

### 5.3 Specific Animations

**Page entrance (dashboard pages):**
- Stats row: fade-up, y: 16px → 0, stagger 80ms
- Main content: fade-up, y: 12px → 0, 300ms after stats

**Modal open/close:**
- Backdrop: opacity 0 → 0.4, `--duration-moderate`
- Card: scale 0.96 → 1 + opacity 0 → 1, `--ease-spring`

**Sheet (cart, customer detail):**
- Slides from right/bottom, `--duration-moderate`, `--ease-enter`
- Dismisses with `--ease-exit`

**Approval card dismiss:**
- opacity 0, max-height 0, `--duration-moderate`

**KDS new order:**
- Card slides in from top, `--ease-spring`, 250ms

**Status badge transitions:** colour crossfade only, 150ms

---

## 6. RESPONSIVE BREAKPOINTS

```
--breakpoint-sm:  640px;   /* Mobile landscape */
--breakpoint-md:  768px;   /* Large mobile / small tablet */
--breakpoint-lg:  1024px;  /* Tablet / small desktop */
--breakpoint-xl:  1280px;  /* Standard desktop */
```

- **Customer pages:** mobile-first, design for 390px wide as primary viewport
- **Dashboard:** minimum 1024px. Below 1024px: show "Best viewed on desktop" banner but don't break layout
- **KDS:** designed for 1024×600 landscape tablet

---

## 7. ACCESSIBILITY MINIMUMS

- All interactive elements: minimum 44×44px touch target
- All text: minimum 4.5:1 contrast ratio vs background
- Focus states: 3px solid `--color-accent` outline, 2px offset, on ALL interactive elements
- No information conveyed by colour alone — always pair with an icon or text label
- All images: alt text required
- Form errors: announced via `aria-live="polite"`
- All icon-only buttons: `aria-label` required

---

## 8. WHAT NEVER APPEARS IN KITCHENOS

These patterns are permanently banned:

- Purple of any shade — anywhere
- Any gradient background (hero images excepted)
- Decorative illustrations (food clipart, plate icons, chef hats, fork/knife imagery)
- Rounded corners larger than 24px except explicitly noted
- Dark mode toggle — there is no dark mode for Dashboard/Customer surfaces. KDS is always dark.
- "Powered by" footers visible to customers
- Any external font not listed in section 2.2
- Loading skeletons with purple/blue shimmer — use `--color-surface-2` grey shimmer only
- Card hover effects on mobile (touch devices)
- Sidebar badges that show numbers > 99 — cap at "99+"
- Empty state text with exclamation marks — keep messaging calm and professional

---

## 9. CSS CLASS NAMING CONVENTIONS

```
Component blocks:   .c-stat-card, .c-order-ticket, .c-approval-card
Modifiers:          .c-stat-card--elevated, .c-order-ticket--overdue
State:              .is-active, .is-loading, .is-empty, .is-error
Surface prefix:     .kds-* for all KDS-specific overrides
Utility prefix:     .u-mono, .u-truncate, .u-sr-only
```

---

## 10. SESSION OPENER FOR AI TOOLS

When starting a new coding session for any specific page, use this prompt:

> "Apply the KitchenOS design system document to [page name]. The page structure is defined in the page reference document. Surface type is [A/B/C/D/E]. Build the component using the exact design tokens, typography, and component specs from the design system. Do not introduce any new patterns — only use what is defined in the document. Start by confirming the surface type and the key components before writing any code."
