# Kerala Routes V2 — District Explorer RC1

Version: 2.0.0-rc.1. Public playtest release candidate, not a claim of full visual/device acceptance.

## Included
Five compressed exploration districts with terminal transfers; 15-player room limit; three player buses; five account-free NPC passengers; nine bus variants; synchronized configurable day/night, pooled streetlights and budgeted headlights; rain/fog; shops with regional food; server-priced garage and avatar cosmetics; Driver/Passenger XP and KP; route-quality bonuses; stop/speed/signal/lane/impact warnings; missions and Journal; cycling, boating, photo mode; private rooms; text chat, blocking, reports and temporary moderator actions; persistent leaderboards and saves.

RC1 adds full garage category coverage, bags and bicycle frame styles, regional food entries, tea rows/green hills/paddy channels/heritage silhouettes in streamed district scenery, lightweight ambient rain/coast/nature audio, sunset time gating and safe-driving route bonuses. Babylon targeted imports reduced the main bundle from 6.16 MB to about 1.65 MB minified. This is not a device FPS measurement.

## Validation before deployment
64 automated tests passed, including original test coverage, 2/4/8/12/15 socket samples, three-driver ownership, five NPCs, server validation, reconnect, moderation and resource disposal. Production client/server build passed. Compiled two-player walking/boarding/driving/seat anchoring/exit/restart-persistence smoke passed. Local saves isolated from production credentials.

## Remaining limitations
Cloud browser lacks WebGL. Visual, audio, touch, night/rain graphics and real Android/Windows FPS remain unverified. Districts are procedural compressed scenes, with terminal transitions rather than continuous cross-district roads. Advanced one-way/junction behavior, dense ambient crowds and highly detailed wildlife remain future work. Audio is synthesized. Moderation is operator-driven, with a basic filter; no automatic report-vote bans. Live positions/rooms reset on server restart; profile progress persists. Identities remain tied to the browser and site origin. Free Render hosting may cold-start.

## Restore points
GitHub: backup/pre-v2-2026-10-04 at 8bb085c72fd7e5f07613282bcaadd45298b01ad6.
Previously live Render deploy: dep-dausa6npn0mc738v7b3g (commit 4fba2ba06df417270106f2a46d5b2d06ba22ca40).
Sites: existing version 1 at b3a83e115b8b87b1a11349bc7b47cdf4657116cf. Retain original database binding and old Worker source/history.
Supabase: profile table will not be reset. Additive moderation/RPC migrations require validation before server deployment; protect a pre-release snapshot in a private schema. Restore the server/frontend source if necessary; leave compatible additive tables in place. Never restore old profile rows wholesale over newer player progress.
