# V1 playtest validation — 1.0.0

## Automated checks

All 21 tests passed. Production TypeScript checking, Vite client build and Node server build passed. Exact output is in `playtest-results/tests.txt` and `build.txt`.

Coverage: walking/collisions and invalid inputs; exclusive bus ownership; real passenger boarding and unsafe exit prevention; door interlock; steering/braking; both routes and ordered stops; driver/passenger rewards; exploration missions and duplicate rewards; abandoned-bus recovery; handbrake/standing/shared weather; return routes; 12-client capacity/reconnect; ordered save writes and failed-write retry; Supabase REST adapter using a mock endpoint; compact snapshot reconstruction; AI traffic.

Short loopback Socket.IO samples (about 1.8 seconds each):

| Connected clients | Updates received | Mean JSON frame size per recipient |
|---|---:|---:|
| 2 | 27 | 836 bytes |
| 4 | 26 | 813 bytes |
| 12 | 27 | 1,554 bytes |

These measure a local server under synthetic clients. They do not prove Render latency, real internet reliability or a 12-person graphical play session. Frame sizes are before WebSocket compression and vary with activity.

## Browser checks

Headless Chromium checks use two isolated browser contexts, including a touch-enabled 844 × 390 phone viewport. Screenshots and diagnostics are included in `playtest-results/`. Verified through browser controls: claim and drive a bus, brake, switch cab camera, change shared weather, join a second player, move with the touch joystick, board, stand in the aisle, request Kozhikode Beach and reject exit while moving. No JavaScript page errors occurred. Final diagnostics recorded 211 desktop scene meshes, 59 desktop draw calls and 94 phone-viewport draw calls. Software-rendered FPS was only about 3 in this run (about 10–14 in earlier runs); these results do not establish acceptable phone performance. A real-device performance gate remains mandatory.

## Live deployment checks — 2026-10-01

GitHub Pages build/deploy succeeded. Render health reports Socket.IO, capacity 12 and persistence enabled. A live WebSocket test with the Pages origin verified two-player joining, walking to the bus, exclusive driver claim, passenger boarding, standing, destination request, synchronized driving, braking, doors and safe exit. Four synthetic players joined simultaneously. Rejoining retained 30 KP and Low/muted settings; SQL confirmed the profile was written to Supabase. Invalid profile-endpoint tokens were rejected with HTTP 401.

The current cloud browser loaded the public frontend but cannot initialize WebGL, so live graphical rendering and Android performance remain unverified in this environment. Earlier local browser results are described above.

## Remaining release gates

- Verify progress across a deliberate server restart and extended real-player sessions.
- Play the complete terminal → beach → exploration → return-bus loop with two humans.
- Measure actual Android FPS, controls, battery/heat and internet latency; target stable 30 FPS on Low/Auto before expanding.
- Increase to four humans, then up to twelve only if the previous stage passes the checklist in SETUP.md.

V1 is a playtest build. The compressed city, simple lane traffic, fictional buses and anonymous device-bound saves are intentional limits. An active journey resets if the server restarts; saved achievements survive only when Supabase is configured. Live network and database checks passed; physical-phone performance is not yet measured.
