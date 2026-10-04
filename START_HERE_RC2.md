# Kerala Routes RC2

Main game: https://aflahafi.github.io/kerala-routes/

Unzip this folder, install Node.js 22.12 or later, then run:

```sh
npm ci
npm run local
```

For a production build: `npm run build`. Run checks: `npm test`.
Local practice saves remain on your computer. Online uses the existing Render server and Supabase profiles. No production secrets are included. See `.env.example` for server configuration; never place service-role keys in the browser.

RC2 has one 15-player world, connected roads, interdistrict routes CM/CW/CK/MP, four-second held purchases, bus variants and streamed scenery. Open Map for the full schematic network. At a terminal, choose a route while stopped and without real passengers; NPCs leave temporarily. Drive past NIT to the connecting junction. The long roads take real travel time.

The map is an original compressed interpretation, not geographically scaled or a surveyed replica. The earlier RC1 reports are historical. See RELEASE_RC2.md for current evidence and remaining device checks.
