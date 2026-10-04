> Historical Alpha checkpoint below. Current RC1 status: [RELEASE_RC1.md](RELEASE_RC1.md). Deployment results will be recorded in RELEASE_DEPLOYMENT.md.

# Alpha 2 test report

- 61 automated tests passed, including the existing 56 tests and five new regression/initialization checks.
- TypeScript check and production client/server build passed.
- Compiled two-player smoke test checks walking, ownership, boarding, driving, passenger anchors, exit and persisted progress after restart. See playtest-results/alpha2-smoke.json for the latest outcome.
- Short loopback 2/4/8/12/15-client checks remain part of the suite; this does not establish sustained internet/device performance.
- No browser screenshots, actual Android/Windows FPS or touch-device acceptance are claimed.

Evidence: playtest-results/alpha2-tests.txt, alpha2-build.txt and alpha2-smoke.json.
