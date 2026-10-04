# Local laptop playtest — V2 alpha 1

## Start on Windows
1. Keep your existing V1.2 folder. Extract this ZIP into a separate folder such as `Kerala_Routes_V2_Alpha_1_Local`.
2. This project requires Node.js **22.12 or newer**. In Command Prompt, `node --version` shows your installed version.
3. Double-click **START-LOCAL.bat**. First launch runs `npm ci`, which needs internet. Wait for `Kerala Routes V2 alpha ready on port 5173`.
4. Keep that terminal open. Open **http://localhost:5173** in Chrome/Edge. Do not open `index.html` directly.
5. Choose **Low** or **Auto** graphics initially. Enter `DriverTest`, choose Public room 1 and click **Join shared room**.
6. Open a second tab at the SAME URL, enter `PassengerTest` and join Public room 1. Different names are required for simultaneous players.

## First two-player trip
1. Move with WASD / arrows; Shift runs. Drag the scene to look. Approach a parked bus and click **Drive bus**.
2. The passenger walks to the open left door and clicks **Board bus**. NPC passengers may already occupy seats.
3. Driver: **F** closes doors, **B** releases handbrake, W/S accelerates/reverses, A/D steers, Space brakes. H horn, L headlights, C camera.
4. At each marked stop, brake almost to zero and open doors. Follow the next-stop prompt. Passengers can request a destination, sit/stand and exit at an open stopped bus.
5. Check that the seated passenger moves with the bus, and that two people cannot claim the same driver slot.
6. Complete the five-stop route. Choose **Start return journey**, or use **Districts** to continue with everyone aboard. A driver must complete the route, stop and open doors before district transfer.

## New systems
- **Districts:** on foot, stand near the terminal and choose Malappuram, Wayanad, Kannur or Palakkad. Each has five marked route stops. Use Return to terminal if stuck.
- **Shop:** Kozhikode counter is outside Malabar Bakery at approximately x=-32,z=15. Other districts have a counter west of the terminal. Discoveries/stops earn KP. Buy an item; confirm it is charged once. Garage shows owned cosmetics and bus variants with required Driver XP.
- **Garage:** choose a variant while driving a stopped bus at the terminal with no real passengers aboard. Real passengers must exit before customization. NPCs step off automatically and wait 30 seconds before reboarding.
- **Cycling:** stand near the eastern cycle stand (local x=810). Choose Ride cycle; use movement controls, release controls or brake to stop, and choose Park cycle to leave.
- **Boats:** Wayanad and Palakkad have a lake/dock near local x=450,z=38. Board at the dock; paddle with movement controls. Return to the southwest corner of the water and choose Leave boat at dock. Return to terminal is a recovery option.
- **Missions:** review all 16 tasks. Dawn bird photography requires 05:00–07:00; night pier photography requires after 19:00 or before 05:00. Rewards are server-controlled.
- **Photo:** Photo hides the HUD, provides zoom and saves a PNG. Return to game restores controls. Photography mission rewards still require the nearby discovery interaction.
- **Rooms:** create a private room from the title screen. Its P-... code appears in the HUD. A second player chooses Join private room by code. Public-room players should not see private players or chat. Empty additional rooms expire after five minutes.
- **Chat:** use Chat to send text. Travellers contains block/unblock and report controls. Reports save locally; they do not automatically ban someone. Rankings reads saved profiles and can cache results for 30 seconds.

## Save/reconnect check
1. Use Join shared room, earn KP, complete a discovery and note XP/KP.
2. Leave via Settings. Stop the terminal with Ctrl+C, restart START-LOCAL.bat, then join with the SAME browser, address and name.
3. Verify saved KP, journal, missions, purchases and settings. Positions/rooms reset on full server restart.
4. Briefly interrupt a browser connection. The server reserves the player for 20 seconds and brakes a disconnected driver's bus. After grace expires, rejoining returns on foot.
5. Back up `.local-saves` with the server stopped. It contains laptop profile saves and moderation audit records. Do not upload it publicly. Production Supabase saves are separate and unchanged.

## Fast day/night test
Close the running server. In Command Prompt opened inside the extracted folder:
```bat
set DAY_CYCLE_SECONDS=180
set START_HOUR=17
npm run local:built
```
A full day now takes three minutes. Compare the clock in two tabs; inspect sunset, road lamps, headlights, rain at night and dawn. Close that Command Prompt afterward; the normal default is 45 minutes. Low uses emissive street lamps without dynamic street lights; Medium uses up to two nearby lights and High up to four.

## Phone test, after laptop works
Connect the phone and laptop to the same trusted Wi-Fi. Run `ipconfig` on the laptop and use the CURRENT Wi-Fi IPv4 address, e.g. `http://192.168.1.38:5173` only if that is still its address. Keep the server running. Use a different traveller name, landscape orientation, Low/Auto quality. Windows may need Node.js allowed on the private network; do not disable the firewall. No router port forwarding is needed for this local test.

## Evidence to collect
Start with 2–4 players. Test Low/Medium/High at the terminal, in a moving bus, in rain/night and during district transfer. Click Debug and Export metrics after 3–5 minutes. Record laptop/phone model, browser, graphics preset, FPS, p95 frame time, ping and visible issues. Then test 8/12/15 players if stable. These measurements are needed before approving a public release.

## Developer checks
```bat
npm ci
npm test
npm run build
node --import tsx scripts/local-smoke.ts
npm run test:resources
```
The compiled smoke script uses only a temporary local server/save folder and cleans up afterward. The optional shader checker (`python3 scripts/check-shaders.py`) requires Linux EGL/GLES and is not a Windows setup requirement.
