# RC2 deployment verification — 2026-10-04

Main game: https://aflahafi.github.io/kerala-routes/
Source: https://github.com/AFLAHAFI/kerala-routes

- Game source commit: `e2b8cb2b5b08e82cff7a69b19867a6f926f5fb9b`.
- Pages Actions run `37224863188`: success. Fetched the RC2 HTML, release.json and full JS asset under `/kerala-routes/assets/`. Correct Render URL and `kerala-main`; old private-room picker absent. A subsequent report/UI-only commit updates the seat-capacity label and this evidence.
- Existing Render service `srv-dausa5vpn0mc738v78k0` in JASEERA's workspace: RC2 deployed live (`dep-db19obou01pc73dfua7g`). GitHub API updates did not trigger Render automatically, so the existing service was deployed explicitly.
- Restart verification: `dep-db19pl8u01pc73dg3g5g` confirmed live at 18:38:03 UTC; saved-profile reload test passed after that confirmation at 18:39:05 UTC.
- Health: version 2.0.0-rc.2, 15 capacity, exactly one world, persistent saves enabled.
- Live two-player WebSocket smoke: both allowed frontend origins, shared world, five NPCs, boarding, driving, passenger anchors, exiting and leaderboard succeeded. No test chat was posted. Tested only while the world was empty.
- Saved QA progress (30 KP and complete progress object) survived the real server restart. Automatic approval review rejected deletion of the two temporary QA profiles because explicit authorization to delete those exact production records was not present. They remain; no workaround was attempted. There are 42 preserved pre-release profiles plus two QA profiles (44 total). Cleanup awaits explicit user approval.
- All 42 pre-release profiles retained; progress/settings identical to the RC2 backup during verification. Original 41-profile backup and RC1 source rollback branch retained.
- Render error-log query for the release window returned no errors.
- 67 automated regression tests passed; additional updated 2/4/8/12/15 real socket load test passed and rejected the sixteenth connection without creating another world. Production build and compiled local two-player/restart smoke passed.

## Device verification limit

The canonical page was opened in the cloud browser and showed the RC2 title, but that browser cannot initialize WebGL. No claims of verified rendered appearance, Android FPS, touch usability, or long-session device performance are made. Babylon NullEngine checks verify resource disposal, not visual quality. RC2 is a public release candidate.

The downloadable code folder includes source, lockfile, tests, local compiled assets, Windows launchers, research notes and sanitized test evidence. `START-LOCAL.bat` installs dependencies on first run and starts the isolated local server. Production credentials and player saves are excluded.
