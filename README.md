# Kerala Routes V2 — District Explorer

Latest development changes and deployment blockers: **CONTINUATION_STATUS.md**.

Build **2.0.0-alpha.2**, local laptop playtest. Continues the existing V1.2 code.

Extract into a NEW folder, double-click **START-LOCAL.bat**, then open **http://localhost:5173**. Node.js 22.12 or newer is required. The first dependency installation needs internet. Keep the terminal open.

Choose **Join shared room** for laptop multiplayer and persistent local progress. Use two browser tabs with different traveller names. **Practice solo** is temporary and does not save progress.

The local launcher clears production Supabase/server settings. Shared-room saves live in `.local-saves` on your laptop; use the same browser, address and traveller name to recover the same identity. Back up that folder and keep browser site data. This build has not been deployed.

Implemented foundations: five compact districts, six routes, three active buses, nine configurable bus variants, 15 real-player slots, five NPC passengers, district streaming, day/night, lighting, progression/shops, traffic rules, public/private rooms, text chat/reporting, boats, cycling, 16 missions, photo mode and saved-profile rankings.

This is an alpha, not a claim that the entire supplied V2 brief is finished. Read **KNOWN_ISSUES.md** and **V2_PROGRESS.md** for remaining work. Browser visual/device testing and production migration validation are outstanding.

Start with **LOCAL_TESTING.md**. Tests and measurements: **TEST-REPORT.md**, **PERFORMANCE_REPORT.md**. Database and release status: **DATABASE_MIGRATIONS.md**, **DEPLOYMENT_REPORT.md**. The original V1.2 folder and archive were preserved.
