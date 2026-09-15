# QA observations

- Server build and typecheck passed.
- 19 tests passed in workerd/vitest: 2/4/6/8-client rooms, readiness and AI fill, host reassignment, session-token reconnection, room-isolated signaling, results-to-lobby, deterministic rules, invalid-input rejection, lap gates, item consumption, drift boost, respawn, 100 concurrent unique room allocations and the 101st capacity rejection, and preservation of fractional server tick time.
- Two headless Chromium clients: no JavaScript errors; WebRTC connected; race timers both 0:03.85; drift release produced BOOST 1.
- Deterministic AI: track length 1359.61 units, best laps about 68–71 seconds; all eight completed three laps.
- Six-browser audio acceptance passed after fixing offer collisions and responder sender-track binding. All 30 peer endpoints connected, all six clients received audio packets (5,037–13,854 per client), all audio transceivers were sendrecv with live tracks, and no JavaScript errors occurred. Timers sampled sequentially differed by at most 0.05 seconds. Synthetic microphones, same-host network.
- Synthetic microphone/browser tests do not verify real people, WAN latency, NAT relay, audio quality, device switching or an endurance session.
- Required six-human, multi-network endurance test and TURN relay-only test are pending.
- Blender script syntax checked; Blender execution and exported-asset review are pending.

- Eight-browser voice check passed: seven connected peers per client, all 56 receiving endpoints had audio packets (1,312–7,387 each), no JavaScript errors. Full report: browser-eight-result.json. Same-host synthetic media; this is not a WAN or performance qualification.
