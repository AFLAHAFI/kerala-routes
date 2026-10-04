# 2.0.0-rc.1

Expanded garage, regional food and avatar accessories; added streamed district landmarks and lightweight ambience; added measured route-quality bonuses, skipped-stop/unsafe-stop warnings and sunset time gating. Preserved Alpha systems, validated 64 tests and built multiplayer restart smoke. See RELEASE_RC1.md.

# V2 alpha 2 changes

See **CONTINUATION_STATUS.md** for the current development checkpoint: smaller rendering bundle, ninth minibus variant, depot NPC handling, mobile Auto preset, headlight budget and confirmed-impact penalties.

# V2 alpha 1 changes

## Multiplayer and stability
- 15 real players, three exclusive driver slots and five lightweight NPC passengers per room.
- Public rooms 1–3 and private invite-code rooms; snapshots/chat/time stay within each room.
- Unexpected disconnect reserves a seat/driver slot for 20 seconds; a disconnected driver's bus brakes safely. Explicit leave releases immediately.
- Bus motion interpolation, passenger anchoring and teleport snapping; NPC updates occur before real-seat alignment.
- Traffic removals propagate through delta snapshots. At most 12 AI vehicles per room, allocated to occupied districts.
- Fixed the second bus parking position so it can be claimed inside the terminal stop area.

## World and rendering
- Original Kozhikode retained; Malappuram town, Wayanad forest, Kannur coast and Palakkad field district foundations added.
- Generated district scenery loads in nearby chunks and releases resources when leaving. Shared deterministic buildings provide matching collision data.
- Low/Medium/High/Auto presets retained; street-light budgets 0/2/4. Distant avatars and buses use simpler models.
- Server-owned configurable 45-minute day/night cycle; five-second clock sync with smooth client interpolation.
- Moving sun, sky/fog transitions, night ambient light, street lamps and automatic bus headlights. Manual override remains available.
- Light/heavy rain, fog and mist; low-cost wet-road material changes.
- Fixed V1.2 water shader references to undeclared variables. Four custom shaders compile and both shader programs link in a headless GLES2 test.
- Photo capture uses the end of a rendered frame instead of keeping the drawing buffer preserved every frame.

## Driving and progression
- Eight original fictional variants share the tested seating/chassis and configurable physics. Roof equipment, colors, trim, acceleration, speed and XP unlocks differ.
- Indicators, brake lamps, automatic/manual headlights, cabin light, suspension movement and synthesized engine audio.
- Separate Driver XP / Passenger XP and KP currency; legacy saves migrate without resetting progress.
- Server-priced food/cosmetic purchases with duplicate-request protection; paint, seat fabric, horn and outfit options.
- Traffic signals, crosswalks, speed zones, keep-left warnings and small repeat-violation Driver XP penalties. Ordinary mistakes do not remove KP.
- Simple driver rating and eight saved-profile ranking categories.

## Exploration and social
- Driver-and-rider district transfer after completing a route; walkers transfer from terminals.
- Cycling in all districts; bounded lake boats in Wayanad and Palakkad.
- Four district discovery missions, cycling/boating missions and dawn/night photography: 16 missions total.
- Photo mode, zoom, clean HUD and PNG capture.
- Room text chat, basic English profanity filtering, rate limits, duplicate prevention, temporary spam mute, block/hide and reports with server evidence.
- Moderator-only temporary mute/kick/ban endpoint with audit persistence before applying the action; reports never automatically create permanent bans.
- Shared-room laptop saves survive server restarts. Local mode does not use production credentials.
