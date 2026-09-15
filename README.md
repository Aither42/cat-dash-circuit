# Cat Dash Circuit
A playable 3D multiplayer cat racing vertical slice. Built with Higgsfield hosting, Three.js, a server-authoritative Cloudflare Durable Object simulation, and room-scoped WebRTC voice.

## Play
Create a room; share its two digits. Other players join, choose a cat and press Ready. The host starts.
A/D or arrows: steer. Shift + steer: drift; release for boost. Space: jump. S: brake. E: item. R: recover.
Mic On requests permission. Voice remains available in the lobby, race and results.

## Local development
Install Bun and Node 22, then:
```sh
cd app
bun install --frozen-lockfile
bun run build
bun run dev
```
Open the local URL printed by Wrangler. Restart the development server after rebuilding static files if it reports stale-asset errors.
```sh
bun run test
```
The test suite uses the real workerd runtime with WebSockets, plus deterministic simulation tests.

## Contents
- docs/DEVELOPMENT.md: development plan, roster, art direction, architecture, room/voice logic, gameplay, asset and track plans, UI flow, QA checklist, limitations.
- docs/QA.md: observed test results and outstanding release gates.
- tools/blender/build_assets.py: six proxy rigs, named starting animation clips, .blend and GLB export script.
- tools/qa/browser.cjs: repeatable multi-browser race and fake-microphone WebRTC test. Requires Playwright and Chromium.
- app/src: authoritative server and deterministic racing rules.
- app/public: playable 3D client, UI, voice and reference-based portraits.
- design/assets.csv: asset manifest.

## What remains
This is a prototype, not the complete production game. Runtime cats are procedural meshes; premium fur and bespoke animations remain art work. Shortcuts and obstacle variety need further design. Full prediction, production abuse protection and broad browser/device testing remain work.
TURN_URL and TURN_SECRET must be configured for reliable relayed voice on restrictive networks; see DEVELOPMENT.md.
The six-human WAN endurance test is still required. Automated browser clients and synthetic microphone packets do not establish real-world voice quality.
The Blender generator has passed Python syntax validation but has not been run in Blender.

