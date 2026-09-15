# Cat Dash Circuit — development and handoff
A real 3D browser racing prototype built on Higgsfield. Cats run on paws; there are no vehicles.
This is a vertical-slice foundation, not a claim that the entire production brief or six-human acceptance test is complete.

## Run and play
Open the deployed game. Play Online → enter name → Create Room. Tell friends the two-digit code.
Friends use Join Room. Select cats, each human presses Ready, host starts. Empty seats become AI.
A/D or arrows steer; Shift+steer drifts; release for boost; Space jumps; S brakes; E uses held item.
Gamepad: left stick steer, A jump, X item, RT drift, LT brake. Touch controls appear on coarse pointers.
Mic On requests permission. Muting or permission denial does not stop gameplay.
Results keep voice and room membership. The current lobby host returns everyone to lobby.
The menu previews an animated procedural cat; portraits are concept art derived from the four user references plus two originals.

## Development plan and priorities
1. Authoritative room allocation, validated controls and deterministic simulation.
2. Lobby ready flow, 30-second reconnect, host-role reassignment and persistent match state.
3. Room-scoped WebRTC mesh, individual mute/volume and microphone-denial handling.
4. 3D track, expressive movement, three-level drift, items and AI.
5. Automated 2/4/6/8-client protocol checks and browser/audio checks.
6. External TURN configuration, six-human WAN endurance test, latency tuning.
7. Replace procedural proxy meshes with reviewed Blender assets; finish shortcuts, obstacles and animation polish.

## Character roster — all gameplay stats identical
| Cat | Basis | Personality | Idle direction | Victory direction | Defeat direction |
|---|---|---|---|---|---|
| Ember | Reference: dark fluffy Persian, yellow eyes, enormous tail | Proud and theatrical | Regal chest lift, slow tail | Triumphant tail fan | Offended head turn |
| Mochi | Reference: compact flat-faced calico | Stubborn chaos | Tiny head wobble | Bouncy paw stomps | Squash and pout |
| Bolt | Reference: spotted Bengal, big ears, green eyes | Alert competitor | Scanning ears | Athletic hop | Irritated paw scrape |
| Pip | Reference: tuxedo, white bib and socks | Curious trickster | Inquisitive head tilt | Playful spin | Sheepish ear tilt |
| Nimbus | Original silver-blue plush shorthaired | Calm, secretly fierce | Slow plush breathing | Unexpected big bounce | Dramatic flop |
| Suki | Original cream-point, blue eyes | Elegant, slightly arrogant | Upright chin | Graceful stretch | Disdainful glance |
Runtime currently supplies shared procedural animations with per-character offsets and proportions. The full bespoke personality pose direction above remains an animation task. Blender script creates named starting clips; validate them before shipping.

## Art direction and tool pipeline
STYLE: premium stylized 3D collectible cats, oversized glassy expressive eyes, soft tactile fur, rounded clean silhouettes, twilight indigo with coral lanterns and turquoise neon, warm cinematic toy-scale Japanese festival diorama, playful athletic poses.
World colors: indigo/plum buildings, coral lanterns, pale mint item cues, warm paw-level lighting.
Higgsfield generated the launch concept and six-cat portrait sheet using the supplied references.
The game uses genuine Three.js meshes, not a pre-rendered video or a 2D race mockup.
Live models are low-detail procedural proxies. Semi-realistic fur and premium animated-film topology are not implemented.
Blender is not installed in the editing sandbox. tools/blender/build_assets.py is an unexecuted generator for six proxy rigs, .blend files and .glb exports.
Run with Blender 4.2 LTS:
```
blender --background --python tools/blender/build_assets.py -- --output exported
```
Next artist pass: compare reference silhouettes, sculpt face/tail, retopologize (~8k triangles hero, 3k LOD), UV, bake normals/base color, add fur cards, test weights, refine 14 clips, export GLB. Use one cosmetic skeleton family and identical collision/movement dimensions.
Do not call generated concept images “game-ready 3D assets.” Mesh cleanup and authored animation remain real work.
Three.js license is included in public/vendor/LICENSE.three.

## Architecture
Browser sends only bounded steering and booleans at 20 Hz through a WebSocket. It never sends coordinates, checkpoint indices, inventory or finish times.
A Cloudflare Durable Object per room owns the simulation, seats, items and race results.
A directory Durable Object serializes allocation of 00–99. It cannot accidentally reuse an occupied code; after exhausting 100 active rooms it returns a capacity error. The code remains two digits for the user.
Internally a random generation identifier distinguishes different lifetimes of the same code. It is never typed by players.
Directory leases are 120 seconds and refreshed by active rooms every 20 seconds. An abandoned unjoined room expires.
Room state is persisted on every server alarm, compatible with hibernation. Race alarms request a 50ms cadence, lobby 500ms. Alarm scheduling is not a hard real-time guarantee; WAN acceptance must measure jitter.
Server derives animation cues, speed, jump, drift, boost, inventory, projectile positions, obstacle hits, checkpoints, laps and finishes.
Rendering interpolates to snapshots and extrapolates at most 100ms. There is no full input-history client prediction/reconciliation yet; high-RTT responsiveness is an open acceptance item.
The pure six-function simulation contract remains in src/logic.js. Transport reserves @server for ticks and never passes client tick requests through.
Keep public/simulation.js in sync with src/logic.js; it supplies the same track definition to rendering.

## Security, rooms and reconnect
New connections receive random server-issued player IDs and secret resume tokens. Tokens remain outside public room snapshots.
A returning browser presents its token, replacing its previous socket. Session storage survives reload; no visible invite secret is needed.
A 30-second disconnect window preserves position, checkpoint, lap, item and cat identity. After it expires an AI can take over the racer.
When the host disconnects, the earliest connected member becomes lobby host. Race authority stays on the dedicated server.
Incoming frames have a size bound and per-socket rate limit. Same-origin checks reject foreign browser origins.
Inputs reject nonfinite steering, unknown keys, impossible values, client tick actions, and unknown racers.
Two-digit codes are deliberately easy to discover. They are a convenience mechanism, not private-room authentication. The prototype has no user accounts or ban system.
Cross-socket allocation spam/abuse rate limiting and production observability are follow-up work.

## Voice implementation
WebRTC audio mesh, up to seven peers per client. Signaling is forwarded only inside the same server room to connected member IDs.
A deterministic peer-ID rule selects one offerer per pair, with perfect-negotiation fallback. Responders reuse the transceiver created by the remote offer, avoiding silent unassociated senders. Early ICE candidates queue until a remote description exists.
Audio receive works even if the local microphone is disabled. Mic controls use replaceTrack so race state is independent of capture.
Controls: Mic On/Off, Mute Self, individual mute, individual volume, master volume, optional V push-to-talk. RMS level produces a small speaking indicator.
Permission denial displays “Microphone disabled.” Failed audio never pauses the race.
STUN works for many networks, but cannot guarantee voice behind restrictive NAT/firewalls.
For production set TURN_URL and TURN_SECRET in Higgsfield website settings and redeploy. TURN_URL is comma-separated relay URLs. The server issues one-hour HMAC-SHA1 TURN REST credentials after validating the room resume token. Never put the shared TURN secret in the client.
Provide UDP and TLS relay URLs (including TLS 443 where supported), enforce quotas, and test relay-only connections.
Six-human voice acceptance is pending. An SFU is the recommended later option if mesh CPU/upload is unacceptable at eight players.

## Gameplay implementation and limits
Fixed 50ms simulation; approximately 19 track units/sec normal speed. Automatically runs forward.
Steering changes heading with momentum; braking reduces target speed; track borders apply forgiving speed loss.
Drift requires steer + drift at speed on ground. Charge thresholds 12/32/55 ticks produce levels 1/2/3. Release gives bounded boost.
Jump is edge-triggered; airborne height and velocity are server-owned. Main bridge launch is automatic.
Tuna: strong short boost. Yarn: forward projectile. Fish: steers toward next racer. Cardboard: blocks one hit. Catnip: boost and hit resistance. Cucumber: rear trap with sideways startle.
The back half gets a recovery-biased item pool; item boxes have server cooldowns. Shield and inventory cannot be replenished by repeated use messages.
AI varies lateral targets and drift timing, uses items, and recovers at borders. It is functional but the requested named behavior archetypes are not fully authored.
Race ends when all finish, 30 seconds after the first finisher, or at a six-minute cap; unfinished racers show DNF.
Track-following coordinates make large-section skips and reverse-lap exploits impossible through controls. This is an accessible constrained racing controller, not unrestricted world-space physics.
R / Reset returns to the last valid gate with a three-second cooldown. Lap/checkpoint state cannot advance through recovery. Borders also provide forgiving collision recovery.
Audio uses synthesized cues and an optional playful sequence. Bespoke meow/purr recordings and a mastered soundtrack remain future assets.

## Track and scene plan
The closed Catmull-Rom path is sampled into 512 points, with 12 ordered gates and three laps.
Main straight → festival drift bends → precision roof entrance (~29%) → elevated bridge and big launch (~44%) → winding market → shop shortcut entrance (~61%) → puddle (~74%) → narrow tunnel (~82%) → finish.
Item boxes sit at alternating lanes around the track. A robot vacuum sweeps across at 17%.
Current shortcuts award bounded progress efficiency after a jump into the left lane. The first has a separate roof ribbon. The second has a sign/trigger but is NOT yet a fully modeled shop interior. Branch entry/exit geometry and full shortcut collision polish remain work.
Food stalls, lanterns, neon signs, market buildings and finish banners are implemented. Dog chase, footsteps, bicycles, falling fish, rolling balls and smashable cardboard are still planned.
Track length and AI lap timing are measured in the QA notes, not assumed.

## Asset and folder organization
app/src: authoritative logic, room transport, worker routing and metadata.
app/public: renderer, controls/UI, voice, styles, portraits, launch art and vendor library.
design/assets.csv: visual/audio manifest.
tools/blender: six-character proxy generator.
docs: development/QA/TURN instructions.
For production asset expansion use characters/{reference-based,original,textures,rigs,animations,portraits}, environments, props, items, audio, ui and scenes. Runtime procedural geometry intentionally avoids empty asset placeholders being presented as finished models.

## UI flow
Main menu (Play Online / Meet racers / Settings) → Create or Join → Lobby → Select and confirm cat → Ready → host Start → synchronized countdown → race HUD → results → same lobby.
HUD: rank, lap, time, best lap, item, drift meter, speed, minimap. Voice controls persist through lobby/race/results.
Settings: game volume, voice master, music, reduced camera movement, push-to-talk.
Keyboard and basic gamepad driving plus touch buttons exist. Full gamepad menu navigation/remapping/localization remain polish tasks.

## QA acceptance checklist
Automated checks cover 2/4/6/8 client membership, 8-racer AI fill, readiness, host migration, resume token authentication, signal isolation, generation mismatch, deterministic replay, input rejection, item consumption, drift boost, gate/lap progression, AI completion and return-to-lobby.
Before claiming release readiness, record:
- Six real humans on different networks, 30+ minutes, at least ten repeated races.
- 2/4/6/8 real-client tests with simultaneous microphones and relay-only voice.
- RTT 50/100/200ms, jitter, loss, tab suspension, browser reload, server eviction.
- Exactly 100 occupied codes, concurrent allocation, capacity response, expired code reuse.
- Permission denied, no microphone, muted self, per-peer mute/volume, PTT and audio device changes.
- Host disconnect in lobby/countdown/race/results and reconnect just inside/outside 30 seconds.
- Ordered laps, legitimate shortcut entry, forbidden state injection, repeated item spam.
- Jump landing/roof route, obstacle interactions, all six items, slow clients and last racer.
- Desktop 60fps target, mobile frame-time/thermal measurement, GPU memory, draw calls.
- All six characters silhouette/pose review, camera clipping at every turn, readable contrast.
A test-client count is not a substitute for six human players or real-network audio quality.

