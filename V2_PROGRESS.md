# Alpha 2 checkpoint

See CONTINUATION_STATUS.md for current changes. Nine bus variants now include a six-seat minibus; NPCs no longer prevent depot customization. The following table records the preceding Alpha 1 baseline and remaining scope.

# V2 progress — alpha 1

This is a substantial playable-code milestone, not a finished/public V2 release.

| Area | Current status |
|---|---|
| V1 movement, buses, boarding, routes, missions | Retained; automated regression checks pass |
| 15 players / 3 driver buses / 5 NPCs | Implemented; local socket capacity and simulation tests |
| Five districts / six routes | Procedural foundations and transfers implemented; richer authored map detail pending |
| Streaming / LOD / culling | Implemented; repeated chunk disposal tests pass; original Kozhikode core remains resident |
| Day/night / street and bus lights | Implemented; mathematical/resource/shader checks pass; visual acceptance pending |
| Eight bus variants | Implemented as one configurable chassis; not eight wholly separate detailed body models |
| XP / KP / food / basic garage | Implemented; authority/idempotency tests pass |
| Traffic rules | Signals, keep-left, speed zones and impact warnings implemented; full one-way/junction rules and route bonus scoring incomplete |
| Boats / cycling / photo / missions | Basic controls and 16 missions implemented; real-device playtest pending |
| Rooms / chat / block / reporting | Implemented with room-isolation tests; comprehensive multilingual moderation and a moderator dashboard incomplete |
| Laptop saves / rankings | Implemented and restart-tested |
| Supabase changes | SQL and Edge Function changes prepared; not executed/deployed |
| PC/Android FPS and UI | Not measured or visually verified in this environment |
| Online release | Not performed; release gates remain open |

The original V1.2 is recoverable from its separate preserved archive/folder and the local development baseline tag. The ZIP is for testing the new foundation and collecting reproducible feedback.
