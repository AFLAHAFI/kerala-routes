# V2 RC1 live deployment — 4 October 2026

Version: **2.0.0-rc.1** · **Public Playtest**

Play: https://aflahafi.github.io/kerala-routes/
Sites: https://kerala-routes-first-journey.aflah123.chatgpt.site
Server: https://kerala-routes-server.onrender.com/health

## Published services
- GitHub main: `0ecd342acf7ae458a748a7897cec7de1b6e58bb6` (release code). Pages workflow `37202238793` succeeded.
- Render: existing `kerala-routes-server` in JASEERA's workspace. Deploy `dep-db14dfe0tbcc739ff6kg` live; health reports RC1, capacity 15 and persistence true. Restart verification deploy `dep-db14l8ad0e5s73e3dddg` also live.
- Supabase: existing `kerala-routes-v1`, `jinryijqgyyfsjhushym`. No replacement project.
- Sites: existing public Site, version 2, source `e4c315c15eee03a055b8d02d0bb4c07936d3db9c`; deployment `appgdep_6ac24a2f22bc819197cbbfdf81dd749a` succeeded. The same Render server powers both game links.

## Verified
- 64 automated tests pass, preserving original coverage. Includes local 2/4/8/12/15 connection samples, three exclusive drivers, five NPCs, purchases, moderation and reconnect behavior.
- Production client/server build passes. Main JS approximately 1,648 kB, 412 kB gzip (original Alpha1: 6,158 kB / 1,366 kB gzip).
- Compiled local two-player walking, boarding, driving, passenger anchors, exit and save reload after restart passed.
- Live Render WebSocket test: 15 concurrent clients in an isolated private room; five NPCs; Pages and Sites Origin headers accepted. Walking, boarding, driving, passenger anchoring, exiting, chat and persistent leaderboard queries passed.
- SQL confirms all 15 newly created QA profiles were saved with V2 progress. Test driver earned 30 KP through ordinary server-authorized play.
- Public HTML has RC1 title and the production JavaScript asset loads.

## Supabase changes and data preservation
Applied `v2_rc1_profile_restore_point` and `v2_rc1_moderation_and_leaderboards`. New moderation table has RLS; leaderboard RPC is security-invoker, service-role only. All eight metric queries execute and return at most 20 rows. Anonymous/authenticated callers cannot run the RPC; anonymous callers cannot write reports.

All 41 pre-existing profiles, progress and settings were unchanged immediately after migration. A private-schema snapshot contains those 41 profiles. The profile-store Edge Function is version 2 and retains the existing custom server-token authentication. No server secrets are built into the frontend.

Security advisor results contain only informational RLS-without-policy notices for intentionally server-only tables. This access pattern is deliberate; see https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

Sites' old D1 binding, migrations, Worker source and version-1 history are preserved. Old Sites v0.8 saves are not automatically merged into Supabase identities. Continue using the original Pages URL and browser/name to retain the existing Supabase traveller identity.

## Limits and unfinished scope
This is a release candidate, not a fully visually accepted final game. Cloud Chrome downloads RC1 but reports WebGL unavailable. Android/Windows FPS, touch, cameras, night/rain visuals and audio acceptance remain unverified. Fifteen automated live connections are a short functional check, not a long real-device stress test.

Districts remain compressed procedural scenes with terminal transfers, not one continuously drivable five-district map. Advanced junction/one-way traffic, detailed wildlife/crowds and further visual polish remain. Chat filtering is basic; human moderation controls require a configured server-only moderator token. Rooms/live positions reset on restart; profile progress persists. Free Render may cold-start. Render's log retrieval API returned an upstream 502/503, so a recent error-log scan could not be completed.

## Rollback
GitHub `backup/pre-v2-2026-10-04` preserves stable source `8bb085c72fd7e5f07613282bcaadd45298b01ad6`. The original live Render deployment was `dep-dausa6npn0mc738v7b3g`. Sites version 1 remains the previous publication. Revert source via a new commit and redeploy if needed; leave compatible additive database objects in place. Never overwrite newer progress by restoring the entire old profile snapshot.

## Final save-recovery check
Passed: after Render started a new process, the QA driver rejoined with the exact saved V2 progress and 30 KP loaded from Supabase. All 41 original profiles still matched their pre-release progress/settings. The 15 disposable QA profiles were removed by exact identity with an additional exclusion for every original profile.
