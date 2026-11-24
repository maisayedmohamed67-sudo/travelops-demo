# TravelOps — Handoff (desktop → cloud / Claude Code)

> **ملخص بالعربي:** ده ملف التسليم لمشروع TravelOps. فيه الفكرة، اللي اتبنى لحد دلوقتي (v4 → v26)، إزاي الكود متقسم، والخطوات الجاية. اقرئيه أنتي أو خلي Claude يقراه في أول أي سيشن جديدة (Claude Code أو كلاود أو ديسكتوب) عشان يكمل من نفس النقطة.

_Source: written on 2026-11-24 from the live artifact "TravelOps — B2B Operations Prototype" (version `1794932471-97b5`). The desktop chat history itself wasn't visible from the cloud session, so this is built from the code and its version notes. Add anything from the chat that is missing in the **Decisions not in the code** section._

## 1. The product
An operations system for a B2B travel / DMC company in Egypt (Cairo, Giza, Luxor, Aswan, Hurghada, Sharm El Sheikh).
Agencies and corporate customers send requests by email. The team:
1. Records the request (customer, services, dates) — **New**
2. Gets prices from the pricing team and builds a quote — **Quotation**
3. Collects the deposit / installments — **Deposit**
4. Books with suppliers (hotels, transport, VIP, flights, guides…) — **Booking**
5. Sends the final confirmation — **Confirmation**

Around this: Finance (payments, approvals, bank reconciliation, reports), Suppliers, Admin & permissions, Drivers & cars, HR.

## 2. Current state
- **Format:** one HTML file, ~5,800 lines, vanilla JS, data in browser `localStorage`. Published as a public artifact: https://claude.ai/artifact/LQsffhcj8TJiZtt6pfXZ2B
- **Status:** working clickable prototype with seed data, 7 demo employees and the "Viewing as" role switcher.
- **Not connected:** Outlook (emails are simulated), n8n, Supabase, payment gateways.

## 3. What has been built (by version)
| Version | Area |
|---|---|
| base | Requests, stages, services, pricing logic, payments with receipts, SLA timers |
| v4 | Unified service editor, new New Request flow, request details per stage, quotation + PDF, deposit, payment schedule |
| v5 | Operations Dashboard (KPIs, tasks, SLA, charts, global search) |
| v6 | Finance workspace: customer payments, verification, allocations, payables, approvals, expenses, bank import & reconciliation |
| v7 | Simple "My Work" dashboard (default) |
| v8 | Agreed workflow: roles & access, reply deadlines, hotel destination, pricing locks, booking confirmation, navigation, New Request in 3 tabs |
| v9 | Pricing Approvals: manager queue + review page |
| v10 | New Request redesign: live summary, demo inbox, recent customers, day-by-day trip |
| v11 | Plate numbers per vehicle type |
| v12 | Suppliers redesign: directory, supplier page, report |
| v13 | Reports redesign: filters, charts, CSV / print |
| v14 | Custom service types |
| v15 | Email conversation inside the request (simulated) |
| v16 | Email signature per employee |
| v17 | Dashboard team view for managers |
| v18–v23 | Finance pages redesigned: Payment Approvals, Customer Accounts, Bank & Cash, Bank Reconciliation, Company Expenses, Financial Reports |
| v24 | Admin & Permissions: teams, roles, working hours, services, finance approval path, company & email, rules |
| v25 | Drivers (phone pages) and Office cars & km |
| v26 | HR: candidates, CVs, interviews, requests to HR |

## 4. Design principles the code follows
- Nothing is silently deleted or overwritten: migrations only add fields, and verified finance amounts are reversed, not edited.
- Permissions are checked inside actions, not only by hiding buttons.
- Timers count working minutes (working hours are set in Admin).
- Estimated supplier costs stay on the service. Only real obligations become payables in Finance.
- No fixed deposit %: the payment requirement before Booking follows the agreed terms.
- Browser windows instead of `prompt()` / `alert()`.

## 5. Known limits
- All data is per browser (localStorage). There is no sharing between users or devices.
- CSV / PDF downloads only work inside claude.ai (`window.claude.use('downloads')`). Locally they need a fallback.
- The file is large and built in layers (later versions wrap earlier functions). Edit the last definition of a function.

## 6. Suggested next steps
1. **Repo setup:** push to GitHub, then turn on GitHub Pages so the demo has a link that works outside claude.ai.
2. **Local downloads:** add a Blob + `<a download>` fallback when `window.claude` is missing.
3. **Split the file** (optional, its own PR): `index.html` + `css/` + `js/` by module. No behaviour change.
4. **Backend plan:** move `S` to Supabase tables (requests, services, pricing_rounds, quotes, payments, fin_tx, suppliers, employees…), with row-level security that matches the current roles.
5. **Integrations:** Outlook / Microsoft Graph for the email conversation, n8n for reminders and supplier emails.

## 7. Decisions not in the code
_(Fill in from the desktop chat: customer names, pricing rules, what the client asked for next, deadlines.)_
-
