> Historical Alpha checkpoint below. Current RC1 status: [RELEASE_RC1.md](RELEASE_RC1.md). Deployment results will be recorded in RELEASE_DEPLOYMENT.md.

# Alpha 2 measured changes

The main JavaScript build is **1,640.94 kB / 409.47 kB gzip**, compared with Alpha 1 **6,158.36 kB / 1,365.96 kB gzip** in the same environment. This is approximately 73% less minified JavaScript and 70% less gzip transfer for the main bundle. Additional lazy shader chunks are separate. No actual-device FPS improvement has been measured.

Auto starts at Low for touch/limited devices. Rendering dependencies are explicitly imported; isolated NullEngine world/pipeline tests and resource lifecycle tests pass. Browser visuals and GPU behavior remain unverified.

## Alpha 1 historical evidence

# V2 alpha 1 performance evidence

This is a local engineering sample, not a laptop/Android FPS certification.

## Changes
- Interpolated remote buses and passenger anchors; snap recovery after teleports.
- Input change gating, delta snapshots, room-scoped messages and bounded AI traffic.
- Nearby district chunk creation/disposal, avatar/bus LOD and distance culling.
- Low/Medium/High street-light budgets of 0/2/4; shared materials and reduced mobile work.
- Photo capture no longer keeps the drawing buffer permanently preserved.

## Measured locally
- Babylon NullEngine: Low 79,421 vertices versus High 101,637 in the test scene (about 22% fewer). This compares presets, not old/new FPS.
- Three streaming cycles: zero retained mesh growth. District switching also checks mesh/material disposal.
- Deterministic 600-frame encoder sample: mean 168 JSON bytes/frame; p95 encode time 0.082 ms. Earlier V1.2 sample was 141 bytes; new fields add overhead, so this is not a bandwidth reduction claim.
- Short loopback Socket.IO samples (1.8 seconds each): 2/4/8/12/15 clients, approximately 15 snapshot packets/sec. Mean sampled payloads: 968/882/1148/1269/1177 bytes respectively. Room state and timing differ; these are not internet throughput guarantees.

## Still required
Actual laptop and Android frame time, GPU usage, battery/thermal behavior, slow-network/reconnect soak tests and visual checks. Start with 2–4 real players and export Debug metrics after 3–5 minutes. Large Vite bundle warning remains. The automated browser could not open the local server (ERR_BLOCKED_BY_CLIENT), so no V2 browser screenshots or real-device FPS are claimed.

Evidence: playtest-results/v2-final-tests.txt and v2-encoder-benchmark.json.
