# Nestlé Ghana — User guide

This guide explains how the **Nestlé Ghana Vendor Onboarding** app is organized, who can do what, and how to use it day to day.

---

## What it is

A white-labelled field app for onboarding and monitoring **koko vendors** across Ghana. Promoters register vendors, capture photos (camera only), questionnaires, footfall, visibility, and competitor intel. Supervisors and admins use **Operations**. The marketing agency uses the **Client / Agency portal** under Field for read-only programme visibility.

| Area | URL prefix | Who uses it |
| --- | --- | --- |
| **Field** | `/dashboard` | Promoters |
| **Agency portal** | `/dashboard` (Client role) | Marketing agency (read-only) |
| **Operations** | `/ops` | Supervisors and Admins |

---

## Roles

| Role | Field | Ops | Purpose |
| --- | --- | --- | --- |
| **Promoter** | Full field tools | No | Onboard vendors, visits, check-in/out |
| **Client** | Agency portal (read-only) | No | Programme KPIs, vendors, visits, map, attendance |
| **Supervisor** | Redirected to Ops | Yes | Users, vendors, questionnaires, alerts |
| **Admin** | Redirected to Ops | Yes | Full ops |

---

## Field (promoter)

1. **Home** — shortcuts and profile  
2. **Check-in** — GPS clock-in / clock-out with selfie  
3. **Vendors** — register vendors (business name, vendor name, phone, GPS, region, district, community, type, years in business) and record visits (multi-category camera photos, questionnaire, footfall, visibility, competitor)  
4. **Route history** — recent attendance pings  

Offline: vendor creates and visits queue on device (including visit-after-offline-register) and sync when online.

---

## Agency portal (client)

Read-only Nestlé programme views (no check-in, no vendor create, no visit capture):

1. **Home** — shortcuts, profile, sessions  
2. **Programme** — KPIs, regional performance, CSV / Excel / PDF exports (date + region filters)  
3. **Vendors** — onboarded vendor directory  
4. **Visits** — visit reports with photos, questionnaire, footfall, visibility, competitors  
5. **Map** — visit GPS points  
6. **Attendance** — daily promoter check-in / check-out roll-up  

---

## Operations

- **Overview** — Nestlé KPIs with date / region / promoter filters, CSV exports, Excel pack, PDF report pack  
- **Vendors / Vendor visits** — master list and visit reports with photo gallery and intel detail  
- **Questionnaires** — seed/edit/activate forms without app updates  
- **Attendance** — daily rollup including **total working hours**  
- **Visits map** — all visit GPS points  
- **Alerts** — new vendors, incomplete visits, sync failures, missed check-ins (in-app + email via Resend to active supervisors/admins who have an email on file). Staging needs `RESEND_API_KEY` / `RESEND_FROM_EMAIL` and emails set on those users (Ops → Users, or `SEED_ALERT_EMAIL` when seeding).
- **Users / Regions / Work areas** — structure and geofencing  

---

## Branding

Nestlé Ghana branding is centralised in `apps/web/src/lib/brand.ts` and CSS tokens (brown palette `#3f2103` → `#d9d3cd`). Logo assets live under `public/icons/`.

Programme overview APIs live under `/admin/nestle/*` (overview, visits-map, CSV/PDF exports).

OpenAPI is exported from `apps/api` (`pnpm run docs:openapi`) and the web Orval client is regenerated with `pnpm run generate:api` in `apps/web`.

## Test users

From `apps/api`: `pnpm exec tsx src/scripts/seed-test-users.ts`

Seeds test users, **all 16 Ghana regions**, and the default questionnaire (if none exist).

| Role | Phone | Code |
| --- | --- | --- |
| Promoter | `0200000001` | `P-test0001` |
| Client | `0200000002` | `C-test0002` |
| Supervisor | `0200000003` | `S-test0003` |
| Admin | `0200000004` | `A-test0004` |

The test promoter is assigned to **Greater Accra**.

---

## Phone QA (camera / offline)

Manual checklist for Safari (iOS) or Chrome (Android) against local or staging PWA. Capture failures as bugs; no automated device lab in this pass.

1. **Install** — Add to Home Screen; open the PWA; sign in as promoter `0200000001` / `P-test0001`.
2. **Clock-in** — GPS check-in with camera selfie (not gallery).
3. **Offline flush** — Enable airplane mode → register a vendor → record a visit with multi-category camera photos, questionnaire, footfall, visibility, and competitors → go back online → confirm the outbox flushes (no stuck items; pending vendor IDs remapped on the visit if the vendor was created offline).
4. **Ops** — Sign in as supervisor `0200000003` / `S-test0003`: vendor appears, visit detail shows photos/intel, overview KPIs update, alert if the visit was incomplete.
5. **Client** — Sign in as client `0200000002` / `C-test0002`: Programme, Vendors, Visits, Map, and PDF pack load.
6. **Camera-only** — Confirm gallery / file-picker upload is blocked for selfies and visit photos.

Note: after the auth storage key rename (`nestle-auth`), existing devices must sign in once again.
