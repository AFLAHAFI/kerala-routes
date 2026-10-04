> Historical Alpha checkpoint below. Current RC1 status: [RELEASE_RC1.md](RELEASE_RC1.md). Deployment results will be recorded in RELEASE_DEPLOYMENT.md.

# Kerala Routes V2 — Alpha 2 development checkpoint

This continues the supplied Alpha 1. It is not the final V2 release and has not replaced any production deployment.

## Implemented in this checkpoint

- Replaced Babylon barrel imports with targeted module imports, retaining the required shadow scene component. Main JavaScript fell from 6,158.36 kB to approximately 1,641 kB (gzip: 1,365.96 kB to approximately 410 kB). This is a download-size measurement, not a device FPS claim.
- Added isolated world/post-processing initialization checks to catch missing import side effects. Existing resource lifecycle checks remain.
- Added Village Mini: six seats, shorter body, matching shared collision bounds, door and seat anchors. There are now nine variants. City, private/hill and coach variants gained distinct fascia/livery details. They remain procedural models using shared physics.
- Depot customization safely disembarks NPC passengers with a 30-second reboarding delay. Real passengers still protect against resizing/customization while occupied.
- Low graphics permits one road-lighting headlamp on the occupied bus. Headlamps receive lighting priority; distant buses do not allocate active beams.
- Auto graphics begins at Low for touch or limited hardware, Medium otherwise; explicit overrides are retained.
- Heavy-impact penalties now require a collision reported by the physics step. Abrupt braking alone is no longer treated as an impact.
- Cached camera-building lookup outside the boom scan. District building arrays were already cached before this change.
- Added an HTML loading message visible before JavaScript has downloaded.

## Release work remains

The original brief is not complete. District art/connected traversal, expanded garage/shop catalogues, richer traffic/junction rules, driver route scoring, exploration/audio/moderation polish and production persistence validation still need work. Consult KNOWN_ISSUES.md for the continuing limitations. Rendering initialization/resource tests do not establish visual correctness. No laptop/Android FPS or touch-device acceptance was performed.

## Existing services identified (read-only inspection)

- GitHub: AFLAHAFI/kerala-routes; production branch `main` was at `8bb085c72fd7e5f07613282bcaadd45298b01ad6` when inspected. Preserve this as a rollback reference and recheck before deployment.
- Development branch: `v2-development-alpha-2` is reserved for this checkpoint. It must not trigger a production release until release checks pass.
- Supabase: existing `kerala-routes-v1`, project `jinryijqgyyfsjhushym`. The table inventory reported 41 profile rows with RLS enabled. No rows or schema were changed.
- Render: account returned `JASEERA's workspace` (`tea-dau8j7ugekts73ddri0g`). Render requires the user to confirm this workspace before service inspection/changes. Confirmation is still pending.
- Sites: existing public `Kerala Routes · First Journey`, project `appgprj_6abbff5171b48191907c42eadba68ab7`. Source opened successfully at `b3a83e115b8b87b1a11349bc7b47cdf4657116cf`. It is the older Worker/D1 implementation. No source/publishing change was made. Preserve its database/history and plan the Render-backed frontend transition explicitly.

## Resume

Confirm the Render workspace, then inspect the existing service/configuration. Continue the unfinished V2 scope. Validate a local release candidate, compatible additive migrations and existing identities before changing production. Update the existing Site after the matching Render/Supabase release is verified. Do not publish this checkpoint as a final release.
