# TravelOps — B2B Operations Prototype

Clickable prototype of an operations system for a B2B travel company (DMC) in Egypt: requests → quotation → deposit → booking → confirmation, plus finance, suppliers, admin, drivers and HR.

**Demo data only.** Everything is saved in your browser's localStorage. Nothing is connected to email, payments or a database.

## Run
Open `index.html` in a browser, or:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
Use **"Viewing as"** in the top bar to switch between roles (Operations, Pricing, Finance, Admin).
To reset the demo, clear this site's storage in the browser and reload.

## Docs
- `CLAUDE.md` — code guide for Claude Code
- `HANDOFF.md` — product context, history and next steps

## Server (sign-in)

`npm start` runs the system behind a login. Settings are environment variables, never files: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (optional `DB_PORT`), and `SETUP_CODE` (16+ characters, used once to activate the first Admin, then removed). Without a database the server answers 503.

`npm test` runs the sign-in tests. For local work without MySQL, set `TRAVELOPS_DEV_MEMORY=1` (never in production).

The system's data is stored in the database as documents. `lib/rules.js` decides what each person may read and change; `lib/data.js` saves changes all-or-nothing with version checks. The first Admin to sign in loads the sample data once.

## Website

The public website is served at `/` (English) and `/ar` (Arabic) from `site/` (content, illustrations, pages). The system is at `/app`. A website request goes through `lib/site-request.js` and becomes a New, unassigned request. `PUBLIC_ORIGIN` (for example `https://www.example.com`) opens the site to search engines; without it every page is noindex.
