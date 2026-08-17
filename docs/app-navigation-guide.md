# Nestlé Ghana — App navigation guide

This guide walks through the **Nestlé Ghana Vendor Onboarding** app: how to sign in, where each role lands, and what to expect on every screen.

Use it as a tour for promoters in the field, agency (client) reviewers, supervisors, and admins.

---

## What the app is

A field + operations product for onboarding and monitoring **koko vendors** across Ghana.

| Who | What they do |
| --- | --- |
| **Promoters** | Register vendors, check in/out with GPS and a selfie, capture visit photos, questionnaires, footfall, visibility, and competitor intel. Works offline. |
| **Client (agency)** | Read-only programme portal: KPIs, vendor directory, visit reports, map, attendance. No field capture. |
| **Supervisors** | Day-to-day Operations: people (promoters/clients), vendors, questionnaires, attendance, live tracking, alerts. |
| **Admins** | Full Operations, including supervisor/admin accounts and full user visibility. |

The product **sends you to the right workspace** after sign-in. You do not pick Field vs Ops from a menu.

| Workspace | URL | Badge in the header | Who |
| --- | --- | --- | --- |
| **Field** | `/dashboard` | Field | Promoters |
| **Agency portal** | `/dashboard` | Agency | Clients |
| **Operations** | `/ops` | Ops | Supervisors and admins |

If a supervisor or admin opens `/dashboard`, they are redirected to `/ops`. If a client opens a promoter capture page (check-in, vendors, route history), they are sent back to Home.

---

## Sign in (everyone)

1. Open the app URL your team gave you (or tap **Sign in** on the marketing home page).
2. Go to **Sign in**.
3. Enter:
   - **Phone number** — as registered (example: `0244123456` or `+233244123456`)
   - **Unique code** — your personal access code (often looks like `P-…`, `C-…`, `S-…`, `A-…`)
   - **Role** — must match how your account was created: Promoter, Client (read-only), Supervisor, or Admin
4. Submit.

**Important:** Phone + code + role must all match. The right phone and code with the wrong role will fail.

**Location:** Promoters are asked for GPS on sign-in when work areas (geofences) are enforced. Supervisors, admins, and clients sign in without that check.

After a successful sign-in:

- Promoter or client → **Home** under `/dashboard`
- Supervisor or admin → **Nestlé overview** under `/ops`

**Sign out** is at the bottom of the sidebar (wide screens) or in the top bar (phones). Always sign out on a shared device.

**Install the app:** On a supported phone browser you may see **Install app**. That puts Nestlé Ghana on the home screen like a native app.

---

## How navigation looks

### Promoter (phone-first)

- **Phones:** four tabs along the bottom — Home, Check-in, Vendors, Route history.
- **Large screens:** the same items in a left sidebar, with **Field** on the logo.
- Until you **clock in for the day**, the rest of the app is locked. You only see Check-in (and Sign out).

A yellow/grey strip appears at the top when you are **offline** or have records **waiting to sync**.

### Client (agency)

- **Phones:** a **Menu** button opens the sidebar.
- **Tablets/laptops:** a left sidebar with **Agency** on the logo.
- Six items: Home, Programme, Vendors, Visits, Map, Attendance.

### Supervisor and Admin (Operations)

- **Phones:** **Menu** opens a drawer.
- **Laptops:** a left sidebar with **Ops** on the logo.
- Sections can be collapsed; they stay open/closed on that browser.

Sidebar groups:

1. **Overview**
2. **Structure & people** — Users, Regions
3. **Field operations** — Work areas, Vendors, Vendor visits, Questionnaires, Attendance, Live tracking, Visits map, Alerts
4. **Account** — Organization, Account

Your name and role sit at the bottom of the sidebar, with **Sign out**.

---

## Promoter — Field app

**Who this is for:** Field staff who onboard koko vendors and record visits.

**Daily loop:** Clock in → register vendors / record visits → clock out. History is there if you need to confirm a check-in landed.

### 1. Home (`/dashboard`)

Shortcuts for Check-in, Vendors, and Route history.

A **Vendor visits** card reminds you that registration and visits work **offline** and sync later.

**Profile** shows your name, phone, role, and assigned region.

**Sessions** lists devices currently signed in (current vs past, IP).

### 2. Check-in (`/dashboard/check-in`)

Daily attendance with GPS and a **selfie**.

What to expect:

1. On first use each day you are **forced here** until clock-in succeeds.
2. The app suggests **clock-in** or **clock-out** based on your last action.
3. Allow location, take a selfie, then submit.
4. Offline: the ping is saved on the device and sent when you reconnect.

If work areas are set up, clock-in may be rejected outside the allowed radius. If you leave a work area, the app can **auto clock-out**.

After a successful clock-in, the bottom tabs unlock.

### 3. Vendors (`/dashboard/outlet-visits`)

Two jobs on one screen: **register a vendor** and **record a visit**.

**Register new vendor** (button: **Register with GPS**):

| Field | Notes |
| --- | --- |
| Business name | Required |
| Vendor name | Required (contact / person) |
| Phone | Required |
| Vendor type | Koko seller, Market stall, Corner shop, Street vendor, Other |
| Region | Ghana region |
| District | Optional |
| Community | Optional — GPS can fill this if blank |
| Years in business | Optional |

The device captures GPS at submit. Offline vendors appear as pending locally until they sync. You can still record a visit against a vendor you just registered offline.

**Record vendor visit:**

1. Pick the vendor (a small map preview appears if they have GPS).
2. **Photos (camera only)** — multiple shots per category:
   - Vendor photo
   - Shop photo
   - Product display
   - Shelf visibility
   - Branding materials
   - Competitor photo
3. **Questionnaire** — whatever Operations has marked active (text, numbers, yes/no, single or multi choice).
4. **Footfall** — estimated count, peak periods, traffic (Low / Medium / High), optional manual count.
5. **Visibility** — Nestlé product available, placement notes, shelf notes, POS / promo materials, stock notes, out of stock.
6. **Competitors** — brand name plus pricing, promotions, discounts, launches, display quality, market notes. You can add more than one brand.

Submit. Online it saves immediately. Offline it queues and a banner shows how many records are waiting.

**History** (top right) opens **Vendor visit history** (`/dashboard/outlet-visits/history`) — your recent submissions with time, photos count, completeness, GPS, and visibility score.

### 4. Route history (`/dashboard/history`)

Your last GPS clock-ins and clock-outs (newest first), with In/Out, time, place, and a **Verified** badge when a selfie was captured.

Use this to confirm attendance reached the server after a flaky network day.

### Offline behaviour (promoters)

- Vendor creates and visits queue on the phone (including visit-after-offline-register).
- Clock-in / clock-out can also queue.
- When you are back online, records send automatically. Do not clear the browser site data if you still have a pending strip — that can drop unsynced work.

---

## Client — Agency portal

**Who this is for:** Marketing agency / Nestlé stakeholders who need programme visibility without entering field data.

Everything here is **read-only**. There is no check-in, no vendor create, and no visit capture. Bookmarks to those pages bounce you back to Home.

### 1. Home (`/dashboard`)

Shortcuts to Programme, Vendors, Visits, Map, and Attendance.

An **Agency portal** card explains the split: promoters capture, supervisors run ops, you review.

Profile and sessions work the same as for promoters.

### 2. Programme (`/dashboard/programme`)

The main KPI board.

**Filters:** From date, To date, Region.

**Tiles (refresh about every minute):**

- Vendors onboarded
- Active promoters
- Daily visits
- Completed questionnaires
- Visibility score (average %)
- Competitor reports
- Footfall (average estimated)
- Incomplete visits

**Regional performance** lists vendor counts by region.

**Exports** (respect the filters):

- CSV vendors
- CSV visits
- CSV competitors
- Excel pack (KPI sheet + vendor distribution)
- PDF pack

### 3. Vendors (`/dashboard/vendors`)

Searchable directory of onboarded koko vendors (name, phone, district, community, region). Cards link out to maps when GPS exists. Use **Open visit reports** to jump to Visits.

### 4. Visits (`/dashboard/visits`)

Visit reports with photos, questionnaire answers, footfall, visibility, and competitor intel.

Filter by vendor, promoter, and date. Export the current page or all matching rows to Excel.

Incomplete visits are labelled so you can see gaps in capture.

### 5. Map (`/dashboard/visits-map`)

GPS points for visits on a map. Filter by date range, region, and promoter.

### 6. Attendance (`/dashboard/attendance`)

Read-only daily roll-up of promoter check-in / check-out.

Pick a date and optional region. Tiles: team size, present, missed, late clock-in, no clock-out.

The table shows name, region, clock-in time, clock-out time, **total working hours**, and status pills (On time / Late / Missed / No clock-out).

---

## Supervisor — Operations

**Who this is for:** Agency or Nestlé ops leads who run the field team day to day.

You land on **Nestlé overview**. The Ops sidebar is your map of the console.

Supervisors **cannot** create or edit supervisor/admin accounts, and the Users list only shows **promoters and clients**.

### 1. Overview (`/ops`)

Same KPI family as the client Programme page, plus:

- Filter by **promoter** as well as date and region
- **Unread alerts** tile
- Quick links into Vendors, Visits, Questionnaires, Attendance, Map, Alerts

Exports: CSV vendors / visits / competitors, Excel pack, PDF pack, Refresh.

### 2. Users (`/ops/users`)

Invite people by **full name**, **phone**, **role**, optional **region** and **gender**.

On create, the person gets an SMS with their access code. If the text does not send, the user is **not** saved — fix SMS and try again.

Supervisors can invite and edit **Promoter** and **Client (read-only)** only. You cannot change another supervisor or admin.

Deactivate someone to block sign-in without deleting history.

### 3. Regions (`/ops/regions`)

Ghana territories used on vendors, user assignment, KPIs, and map filters.

Create a region by display name (a slug is generated). Activate or deactivate existing ones. Copy the region id when assigning a promoter.

### 4. Work areas (`/ops/geofences`)

Circular geofences used when promoter check-in must happen inside a zone.

Create with a label, map pin (lat/lng), and radius in metres (often thousands of metres for a city patch). Toggle active/inactive.

If none are active, promoters can usually clock in anywhere GPS is available.

### 5. Vendors (`/ops/outlets`)

Master list of koko vendors. Create or edit: business name, type, contact, district, community, region, years in business, GPS (map editor), active flag.

This is the office view of the same vendors promoters register in the field.

### 6. Vendor visits (`/ops/outlets/visits`)

Full visit reports: photo gallery by category, questionnaire, footfall, visibility, competitors, completeness.

Filter by vendor, promoter, and date. Export current results or all matching pages to Excel. Incomplete visits show reasons.

### 7. Questionnaires (`/ops/questionnaires`)

The form promoters fill on each visit. You can change it **without an app update**.

- **Seed default** if none exist (Nestlé starter form)
- Create a new questionnaire or edit the selected one
- Question types: text, long text, number, single choice, multi choice, yes/no
- Choice questions need at least two options
- Mark one active — that is what the field app loads

### 8. Attendance (`/ops/attendance`)

Same daily dashboard as the client view, for ops use: date + region, present/missed/late, working hours.

Use this together with **Alerts** when someone did not clock in.

### 9. Live tracking (`/ops/tracking`)

Live map and table of promoters’ latest GPS (clock-in / clock-out pings).

Filter by region or name. Connection status shows at the top (connected / reconnecting). Tap a ping for selfie and geofence detail when available.

### 10. Visits map (`/ops/visits-map`)

All visit GPS points (not live tracking). Filter by date, region, promoter.

Use tracking for “where is the team now?” and this map for “where did visits happen?”

### 11. Alerts (`/ops/alerts`)

In-app inbox (also emailed to supervisors who have an email on file).

| Kind | Typical meaning | Jump link |
| --- | --- | --- |
| New vendor | A promoter registered a vendor | Vendors |
| Incomplete visit | A visit is missing required pieces | Visit reports |
| Missed check-in | No clock-in for the expected window | Attendance |
| Sync failure | A queued field record failed to land | Visit reports |

Mark one read or **Mark all read**. Unread count also appears on Overview.

### 12. Organization (`/ops/organization`)

A directory of cards that deep-link into the screens above. Useful on a laptop as a “what can I configure?” map.

### 13. Account (`/ops/account`)

Your own profile and sessions. Sign-out still lives in the sidebar.

---

## Admin — Operations (full)

**Who this is for:** The person who owns the deployment: users of every role, regions, and overall programme health.

Admins see the **same Ops screens** as supervisors. Differences that matter:

| Area | Supervisor | Admin |
| --- | --- | --- |
| Users list | Promoters and clients only | Everyone (including other supervisors and admins) |
| Invite roles | Promoter, Client | Promoter, Client, Supervisor, Admin |
| Edit elevated accounts | Blocked | Allowed |
| Overview / vendors / visits / questionnaires / attendance / tracking / map / alerts | Yes | Yes |
| Regions / work areas | Yes | Yes |

Day-to-day, use Overview and Alerts the same way a supervisor does. Use **Users** when you need to stand up a new supervisor, rotate an admin, or inspect every account.

---

## Typical days (cheat sheet)

### Promoter

1. Sign in as **Promoter** (allow location).
2. Clock in with selfie.
3. Register any new koko vendor (GPS).
4. Record the visit: photos → questionnaire → footfall → visibility → competitors.
5. Watch the sync strip if you were offline.
6. Clock out at the end of the day.
7. Optionally confirm Route history.

### Client

1. Sign in as **Client (read-only)**.
2. Open **Programme**, set dates/region, export if needed.
3. Drill into **Vendors** or **Visits** for a specific outlet.
4. Use **Map** for coverage and **Attendance** for whether the team showed up.

### Supervisor

1. Sign in as **Supervisor**.
2. Scan **Overview** (incomplete visits, unread alerts).
3. Work **Alerts**, then **Attendance** and **Vendor visits**.
4. Invite promoters on **Users**; keep **Questionnaires** current.
5. Check **Live tracking** during the working day; **Visits map** after.

### Admin

Same as supervisor, plus: create supervisors/admins, review the full user list, and treat regions/work areas as the source of truth for territories and geofences.

---

## Test accounts (local / staging)

If your environment has been seeded (`pnpm exec tsx src/scripts/seed-test-users.ts` from `apps/api`):

| Role | Phone | Code |
| --- | --- | --- |
| Promoter | `0200000001` | `P-test0001` |
| Client | `0200000002` | `C-test0002` |
| Supervisor | `0200000003` | `S-test0003` |
| Admin | `0200000004` | `A-test0004` |

The test promoter is assigned to **Greater Accra**. Do not use these on production.

---

## Quick troubleshooting

| What you see | What to do |
| --- | --- |
| Sign-in fails | Confirm phone, code, **and** role. Codes are role-specific. |
| Promoter stuck on Check-in | Complete today’s clock-in (GPS + selfie). That unlocks the rest of the app. |
| “Allow location” / geofence error | Enable location for the browser. If work areas are on, stand inside the zone. |
| Offline / pending sync banner | Stay in the app until the count goes to zero after you reconnect. Don’t wipe site data. |
| Client can’t find Check-in or Vendors capture | That is expected. Use Programme, Vendors directory, Visits, Map, Attendance. |
| Supervisor can’t add another supervisor | Only an **Admin** can create or edit supervisor/admin accounts. |
| Photos won’t attach | Visits use the **camera**, not the photo library. |
| Empty questionnaire on a visit | Ask ops to seed or activate a questionnaire under **Questionnaires**. |
| No live dots on tracking | Promoters must have clocked in (or pinged) recently; check socket status on the page. |

---

## Related docs

- Shorter role/capability summary: `docs/client-user-guide.md`
- Programme context and branding live in the product (`Nestlé Ghana` brown palette, bird mark).
