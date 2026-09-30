# Kerala Routes V1 — setup and playtest

This package contains the complete source, a built browser client, a built Node server, Supabase SQL, a Render Blueprint and a GitHub Pages workflow. The new V1 has NOT been deployed to your accounts. The old chatgpt.site link remains the earlier release.

## 1. Try the game on your Windows PC

1. Extract the ZIP fully (right-click → Extract All).
2. Install Node.js 22 LTS or newer if it is not already installed.
3. Open the extracted `kerala-routes-v1` folder.
4. Double-click `START-WINDOWS.bat` and keep that window open.
5. Open `http://localhost:3000` in Chrome or Edge.
6. Choose **Practice solo** to drive without a connection, or **Join shared room** in two tabs using different names.

This local server has temporary saves unless Supabase variables are configured. The website must be served over HTTP/HTTPS; do not double-click the built index.html. Online deployment below removes the need to leave your PC on.

## 2. Put the project in GitHub

Use a new **public** repository named `kerala-routes` for GitHub Pages on GitHub Free.

Recommended method: GitHub Desktop.

1. Sign in to GitHub Desktop.
2. File → Add Local Repository → select the extracted `kerala-routes-v1` folder.
3. If asked, choose **create a repository here**; keep the repository rooted in the folder containing `package.json` (do not create an extra nested folder).
4. Review changes and commit with summary `Kerala Routes V1 playtest`.
5. Publish repository; use name `kerala-routes` and uncheck **Keep this code private**.
6. Confirm `package.json`, `render.yaml`, `supabase/` and `.github/workflows/pages.yml` appear at the correct paths on GitHub.

Never add a real `.env` or Supabase secret key to the repository. `.gitignore` excludes secrets, dependencies and build outputs. The supplied `.env.example` contains placeholders only.

## 3. Prepare Supabase saves

1. Create a dedicated project on the **Free** plan at https://supabase.com/dashboard.
2. Choose a nearby available region. Store the database password privately.
3. Open **SQL Editor → New query**.
4. Open `supabase/001_profiles.sql` from this package, paste the full SQL and click **Run**.
5. In the project's API settings, copy your **Project URL** and **secret API key** (usually begins `sb_secret_`). A legacy service-role key is supported too, but never use a publishable/anon key for the server adapter.
6. Keep those values for Render's environment settings. Do not paste the secret into a browser build, GitHub Actions variable or public chat.

The `kr_profiles` table stores a hashed traveller ID, name, KP/mission/journal progress, quality and sound settings. RLS is enabled and browser roles have no table access. Only the game server awards and saves progress.

Anonymous identity: the browser stores a random traveller credential under the entered name. Returning with that name in the same browser resumes the profile. Another device/browser starts a separate traveller. Clearing browser storage loses the credential. V1 does not include account linking or save transfer.

## 4. Deploy the multiplayer server on Render Free

1. Open https://dashboard.render.com and connect GitHub.
2. Choose **New → Blueprint** and select your `kerala-routes` repository.
3. Render reads the included `render.yaml`. Confirm the web service is on **Free**. Do not add a paid database or disk.
4. Fill the requested environment variables:

| Variable | Value |
|---|---|
| `CLIENT_ORIGINS` | `https://YOUR-USERNAME.github.io` — origin only, no repository path or trailing slash |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Your server-only Supabase secret key |

The Blueprint sets `REQUIRE_PERSISTENCE=true`, the Node version, build/start commands and `/health` check. It requests Singapore; if unavailable for your workspace, choose the nearest available Free region.

5. Deploy and wait for **Live**. Copy the assigned `https://YOUR-SERVICE.onrender.com` URL; its exact name may differ from the example.
6. Open `https://YOUR-SERVICE.onrender.com/health`. It should report `ok: true`, `transport: "Socket.IO"` and `persistence: true`.

Manual Web Service alternative, if you do not use Blueprint:
- Runtime: Node; Branch: main; Root directory: blank.
- Build command: `npm ci --include=dev && npm run build:server`
- Start command: `npm start`
- Health check: `/health`
- Instance: **Free**.
- Add the three variables above plus `NODE_ENV=production`, `REQUIRE_PERSISTENCE=true`, and `NODE_VERSION=22.16.0`.

The server's root page may show “Cannot GET /” because the Render server-only build does not contain the frontend. This is expected: use `/health` for the server and GitHub Pages for the game.

## 5. Publish the game on GitHub Pages

1. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**.
2. Add repository variable `VITE_SERVER_URL` with the Render HTTPS URL from step 4 (no `/health`). This URL is public; it is not a secret.
3. Open **Settings → Pages**. Choose **GitHub Actions** as the build/deployment source.
4. Open **Actions → Publish game to GitHub Pages → Run workflow** on `main`.
5. Wait for the build and deploy jobs to turn green.
6. Open the URL shown by the deploy job, normally `https://YOUR-USERNAME.github.io/kerala-routes/`.

The workflow rebuilds the game with the correct server URL. If an earlier workflow failed because the variable was missing, rerun it now. If you later change Render's URL, update the variable and run the workflow again.

## 6. First two-player test

Use a PC and an Android phone, or two browser tabs. Use different traveller names; the same identity cannot play in two tabs simultaneously.

1. Both open the GitHub Pages link. They can use different networks; no local IP/firewall steps are required.
2. Keep graphics on **Auto**. Allow up to about a minute for a sleeping Render service to wake.
3. Both select **Join shared room**; the top-right count should show `2 / 12 online`.
4. Driver walks to bus 1 and selects **Drive**.
5. Passenger walks to its open left-side door and selects **Board**. They can choose **Stand in aisle** or sit, then request a destination.
6. Driver closes doors (**F**), releases handbrake (**B**) and drives (**W/S**, **A/D**; **Space** brakes).
7. Follow the next-stop HUD: Mavoor Road → Mananchira → SM Street → Beach. The map shows the world and buses.
8. At each turquoise ring, stop below 2 km/h and open doors. Driver stop rewards should increase only once for each route/stop.
9. At the beach, passenger exits, walks to a gold marker and uses **E / Take photo / Collect**. Check the journal and KP.
10. Driver chooses **Start return journey**, turns the bus around and serves the stops back to the terminal. A second driver can use bus 2 or select Route A at the terminal so the passenger can catch another player-driven bus.
11. Test Route B to Medical College, Kunnamangalam, Kattangal and NIT. At Kattangal, find plants and the cycle stand.
12. Wait for **Saved**, leave, then rejoin with the same name/browser. Check missions, KP, journal and graphics/sound settings.

## 7. Controls

| Action | PC | Touchscreen |
|---|---|---|
| Walk | WASD/arrows | Left joystick |
| Run | Shift | Hold Run |
| Steer | A/D | Left/right driving buttons |
| Accelerate / reverse | W / S | Accelerate / Reverse |
| Brake | Space | Hold Brake |
| Handbrake | B | Handbrake button |
| Doors | F | Open/Close doors |
| Horn / lights | H / L | Horn / Lights |
| Nearby interaction | E | Contextual action button |
| Camera | C; drag to look | Drag to look; Camera button |
| Map / journal | M / J | Map / Journal |
| Sit or stand | Passenger action button | Passenger action button |
| Exit bus | Exit / E | Exit bus button |

Weather is shared: a driver can change it in Settings; it also cycles every six minutes. Ambient cars, autos, bikes and trucks are AI vehicles. They follow simplified lane paths and slow for obstacles; this is not a full traffic-law simulator.

## 8. Increase to 4 and then 12 players

Do not judge internet performance by local test numbers alone. After a stable two-player trip, repeat with 4, then up to 12 real players (at most 2 drivers). Record device, graphics, FPS, ping, passenger jitter, delayed controls and any console errors. Aim for a usable 30 FPS on supported phones and a responsive connection; these are targets, not measured guarantees. Try Low if Auto is not sufficient.

Suggested pass conditions: both buses can complete routes, passengers remain aboard, stops reward correctly, no duplicate points, disconnect stops the bus safely, returning players recover saves, and controls remain reachable in landscape and portrait.

## 9. Free-plan expectations and troubleshooting

- Render Free has 750 instance-hours shared by the workspace each month. It sleeps after 15 minutes without incoming HTTP/WebSocket messages. Waking can take about a minute. There are also bandwidth/build limits; “Free” does not mean unlimited. Do not configure external artificial keep-awake pings.
- Supabase Free has quotas and may pause projects with low activity over seven days. Resume it in Supabase if the game cannot load saves. If persistence is required and unavailable, the server refuses to silently create empty profiles.
- A failed save shows **Save pending · retrying**. Keep the session open until saved when possible. A sudden process failure before the next successful checkpoint can lose recent unsaved changes.
- GitHub Pages hosts only game files, not Node.js. Public GitHub Free Pages requires a public repository. Never publish a server secret there.
- “Multiplayer is not configured”: set `VITE_SERVER_URL` and rerun the Pages workflow.
- Connecting never finishes: check Render Live status, `/health`, `CLIENT_ORIGINS`, Supabase project status and Render logs. Origins must match the actual Pages host exactly.
- Bus will not move: close doors, release handbrake, check for a vehicle/building ahead.
- Cannot board: stand beside the open left door, inside a marked stop; wait until the bus is nearly stopped and a seat is available.
- Server restart/disconnection: passengers are safely released when their driver disconnects; active trips are not persisted. Reconnect at the terminal and resume saved progress.
- Same traveller already playing: choose a different name in the second tab/device.
- Low FPS in solo too: use Low, clear weather and a smaller window; hosting alone cannot fix graphics rendering speed.

Official references checked for this release:
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/websocket
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/platform/free-project-pausing
