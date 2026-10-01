# Kerala Routes — V1 Playtest (1.0.0)

A browser-based, low-poly Kozhikode bus-driving and exploration game. Real players drive the two buses; other real players wait, board, ride, exit, explore and catch a return bus. Maximum 12 players, including at most 2 drivers. The world is a compressed artistic interpretation of real locations, not a surveyed street map or official bus service.

**Start with `SETUP.md`.** It includes local Windows play, GitHub upload, Supabase SQL, Render Free deployment, GitHub Pages deployment, controls, troubleshooting and a 2 → 4 → 12 player test plan.

## Included gameplay

- Two fictional Kerala-style buses; automatic forward/reverse, steering, brakes, handbrake, horn, headlights, folding doors, external/cab camera and recovery.
- Exclusive real-player drivers; ten rider slots per bus within the 12-person room limit; sit/stand, destination requests, boarding and safe exit.
- Route A: KSRTC Terminal → Mavoor Road → Mananchira → SM Street → Kozhikode Beach.
- Route B: KSRTC Terminal → Medical College → Kunnamangalam → Kattangal → NIT area.
- Start return journeys at the final stop so buses can continue serving passengers. Available buses can be claimed at marked stops. Empty abandoned buses eventually recover to the terminal.
- Nine stops, validated stop sequence, passenger journey rewards, driver shift completion and server-awarded Kerala Points.
- Walking/running, simple cycling, photos downloaded as PNG, plants, food, heritage, hidden discoveries and beach litter collection.
- Eight missions: First Bus Journey, Sunset Photographer, Mittayi Explorer, Clean Coast, City Heritage, Green Kozhikode, Passenger Challenge, First Driver Shift.
- Journal includes Places, Food, Plants, Wildlife, Culture, Environment and Transport milestones.
- Shared clear/cloudy/rain/evening weather. Simplified AI cars, autos, motorcycles and trucks follow lanes and slow for obstacles.
- Houses, shops, shelters, palms/banana plants, poles, bridge and coastal scenery.
- Preset greetings only; no open text/voice chat.
- Desktop keyboard/mouse and phone touch movement, separate driving pedals/steering, interaction and camera buttons.

## Performance work

Socket.IO connections replace HTTP polling. A 30 Hz server simulation broadcasts compact changed-state frames at 15 Hz; input is capped at 20 Hz by the client. Repeated static profile/route fields are omitted from unchanged frames. WebSocket compression is enabled. Local movement prediction and interpolation smooth presentation without letting the client award points or move the authoritative bus arbitrarily.

Fixed bus geometry is merged by material. Static scenery uses vertex colours and spatial batches. Auto graphics adapts resolution; Low disables shadows/bloom and shortens draw distance. Distant traffic/discoveries are hidden. Rain particle counts and shadow-map resolution are reduced. The supplied browser screenshots use software-rendered headless Chromium, not a physical Android GPU.

## Data and persistence

The Node server holds active room state in memory. Supabase stores anonymous player IDs, name, KP, missions, journal and quality/sound settings. Credentials are random 256-bit tokens kept on the player's device; only hashes are sent as public player IDs. Progress writes are serialized, checkpointed and retried. With `REQUIRE_PERSISTENCE=true`, unavailable storage cannot silently reset a player's save. Supabase secret keys stay server-side.

Active bus trips/positions are not restored after server restarts. A restarted server begins at the terminal; saved achievements remain. The local server uses temporary memory storage unless Supabase is configured. The browser credential is not a full account system: clearing it or changing browser/device creates a separate profile.

## Commands

- `npm ci`
- `npm run dev` — local game and Socket.IO server on port 3000.
- `npm test` — simulation, saves, delta protocol, traffic and network checks.
- `npm run build` — type check, browser bundle and Node bundle.
- `npm start` — production Node server; serves built client too when present.
- `npm run build:client` — GitHub Pages build.
- `npm run build:server` — Render server-only build.

Node.js 22.12+ required. No paid assets or API calls are required by the game code. Hosting remains subject to provider free-plan quotas and sleeping/pausing behavior.

## Release status

This is a V1 playtest build, not a commercial release or a guarantee of 60 FPS on every phone. See `TEST-REPORT.md` for measured checks and limitations. The online playtest is deployed at https://aflahafi.github.io/kerala-routes/ using GitHub Pages, Render Free and Supabase Free. The server health endpoint is https://kerala-routes-server.onrender.com/health. Start with 2–4 players and measure performance on real devices.
