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
