# Kerala Routes 2.0.0-rc.2

Canonical frontend: https://aflahafi.github.io/kerala-routes/
Existing backend: https://kerala-routes-server.onrender.com
Existing persistence: Supabase project jinryijqgyyfsjhushym.

## Implemented
- Exactly one `kerala-main` world, capped at 15; legacy selectors cannot create rooms. Room picker removed. Local practice remains offline.
- Four physical connecting road links across five districts. No district teleport action. Interdistrict services CM/CW/CK/MP; same bus, trip, seats and NPCs continue across boundaries. Explicit recovery remains for stuck players.
- Full-world schematic map, following minimap, destination signs and researched public-place-inspired labels/scenery. See WORLD_DESIGN_RC2.md for sources and geographic limitations.
- Server-authorized tea/cup, bottle and food-parcel props held four seconds. Duplicates do not charge or restart the timer. Props are transient, never profile fields.
- Distinct starting ordinary/city/minibus variants, coach luggage panels/headrests/spoiler, hill bumper, minibus bonnet, cabin rails; animated steering/front axle, suspension, doors, brake/indicator/cabin lights.
- Nearby scene chunks are loaded incrementally and disposed at distance. Batched road scenery, bus/avatar LOD, existing bounded lamp budgets. Per-client nearby actor/traffic/NPC deltas retain passengers sharing a bus. The three bus transforms remain globally known for the map.
- No destructive profile schema changes. Original identity hashing, progress and save adapters retained.

## Validation
67 automated tests passed; TypeScript and production build passed. Tests cover continuous road collision samples, physically driven district-boundary crossing, real/NPC seat anchors, purchase expiry/replay, interest removal/re-entry, legacy progress, profiles, 2/4/8/12/15 socket load, save retries, garage and resource disposal. Socket load additionally checks a sixteenth join cannot create another world.

These are automated logic/network and Babylon NullEngine lifecycle checks, not visual or device FPS acceptance. Android/laptop touch, appearance and long-session performance still need physical-device playtesting. This environment has no working WebGL, so RC2 remains a release candidate.

## Rollback and saves
- GitHub `backup/rc1-before-rc2`: 7a7005356365b483ff231a673843c8ba17f62a1d.
- Local tag `rollback-rc1-before-rc2` preserves the local RC1 source history.
- Supabase private `kr_release_backup_20261004.profiles_before_rc2` captures 42 profiles before RC2; original 41-profile backup remains. Backup tables have RLS and no PUBLIC/anon/authenticated grants.
- Code rollback: deploy the RC1 backup commit on Render and republish that source on Pages. Profile backups should only be restored selectively after review, to avoid overwriting newer play progress.

## Release status
RC2 is live on GitHub Pages and the existing Render service. Live two-player and restart-save checks passed; see RELEASE_DEPLOYMENT_RC2.md.
