# CLAUDE.md — TravelOps demo

Read this first in every session. Read `HANDOFF.md` for the product story and the open work.

## What this is
TravelOps is a **B2B travel-operations prototype** for an Egyptian inbound DMC (destination management company).
Agencies and corporate clients send requests (hotels, transport, VIP airport assistance, flights, other services). The team prices them, quotes, collects deposits, books with suppliers, and confirms.
It is a **clickable demo with fake data**. Nothing is connected to a backend: no Outlook, n8n, Supabase or payments.

## Stack and layout
- **One file: `index.html`** (~5,800 lines, ~1 MB). Plain HTML + CSS + vanilla JS. No framework, no build step, no npm packages.
- `package.json` + `server.js` exist only for Node hosting (Hostinger): `npm start` serves `index.html` and nothing else.
- Only external resource: the Google Fonts `Inter` stylesheet.
- Order inside the file:
  1. `<style>` (lines ~8–760): base styles, then one block per version (`/* ===== v5 … */`, `/* ---- v12 … */`).
  2. Static app shell (sidebar `#nav`, top bar, `#view`, `#modal`, `#pop`, `#toast`, `#np`).
  3. One `<script>` (from ~line 790): constants → helpers → seed data → state & migrations → features. Later sections are numbered `v4 … v26`.
- To find something, grep the section banners: `grep -n '^/\* =' index.html`.

## How to run
- Open `index.html` in a browser, or serve the folder: `python3 -m http.server 8000` and go to `http://localhost:8000`.
- **Data lives in `localStorage` under the key `travelops-proto-v1`.** HR CV files go in IndexedDB `travelops-hr-files`.
- To reset the demo, clear the site's storage in DevTools (Application → Storage → Clear site data) and reload. The seed data is rebuilt.
- **Downloads** (CSV and PDF export) go through `offerDownload` (PDF) and `finDownload` (CSV). As a claude.ai artifact they use `window.claude.use('downloads')`. Anywhere else (`window.claude` missing) they call `browserSave`, a Blob + `<a download>`. Send new exports through these two functions.

## Architecture: the important patterns
- **Global state `S`**: loaded by `load()`, saved by `save()` (whole object as JSON). Every change: mutate `S` → `save()` → `render()`.
- **Migrations, never resets**: `migrate`, `migrate2`…`migrate6`, `migrate5` (finance), `migratePlates`, `migrateAdm`, `migrateDrivers`, `migrateHR`. Each one checks a flag or schema and only adds fields. **Keep this rule:** when you add a field, write a migration so old browser data still works. Never delete user data.
- **Hash routing**: `route()` reads `location.hash`. Examples: `#dashboard`, `#requests`, `#new-request`, `#pricing`, `#suppliers`, `#reports`, `#admin`, `#rq-<id>` (request details), `#prv-…` (price review), `#sup-…`, `#customer-…`, finance routes (`isFinRoute`), `#hr…`, `#drive…`. Navigate with `go('name')`.
- **Layered overrides (important)**: later versions often replace an earlier function by wrapping it, e.g.
  `route=(function(o){return function(){ …; o() }})(route);`
  There are about 34 of these. **The last definition in the file wins.** Before editing a function, grep for every definition and wrapper of it (`grep -n 'renderShell' index.html`) and edit the one that actually runs.
- Rendering is string templates into `#view.innerHTML`. Always escape user text with `esc()`.
- The "Viewing as" picker (`switchUser`) changes the current employee. Permissions come from employee fields and roles (`isOps`, `hasFin`, `canPriceCat`, `isAdmin`, `isHR`, `isDriver`…). Check permissions inside actions, not only in the UI.

## Domain model (short)
- **Request stages**: `New → Quotation → Deposit → Booking → Confirmation` (`STAGES`).
- **Service types**: `vip`, `hotel`, `flight`, `transport`, `other`, plus custom types added in Admin. Service statuses: `Pending, Requested, Quoted, Booked, Confirmed, Cancelled`.
- **Pricing**: Ops sends services to pricers by category → pricing rounds → approval / rejection / clarification, with SLA timers counted in working minutes.
- **Quotation**: versions, PDF quote (a built-in minimal PDF writer, no library), customer acceptance, payment schedule (installments).
- **Finance**: customer payments and verification, allocations, supplier payables, approvals with per-user limits, expenses and advances, bank accounts, statement import (CSV/XLSX parsed in the browser) and reconciliation, reports.
- **Other modules**: Suppliers directory, Reports, Admin (people, roles, working hours, services, company and email, rules), simulated email conversation (Outlook-shaped), email signatures, Drivers and cars (km per car, driver phone pages), HR (candidates, CVs, interviews, HR requests).
- **Seed people**: Nadia Farouk (Ops Manager, admin), Omar Saleh (Senior Consultant), Laila Mansour and Karim Adel (Consultants), Sara Youssef (Accountant), Hany Mostafa (Pricing Manager), Rania Khalil (Senior Pricing Manager).
- Currencies: USD, EUR, EGP, GBP, AED, SAR.

## Working rules
- Keep it **one self-contained file** unless the user asks to split it. If splitting, do it in a separate PR (for example `css/`, `js/` by section) and keep behaviour identical.
- Make small, focused edits. Don't reformat or minify the file: diffs must stay readable on GitHub.
- After every change: open the page, switch between a few users (Ops, Pricing, Finance, Admin), and check the browser console has no errors.
- UI language is **English**. The user talks in Egyptian Arabic. Reply to her in Arabic, and keep code and UI text in English.
- All demo contacts use `.example` domains. Keep it that way: no real personal data.
- Commit messages: short and imperative, one feature per commit.
