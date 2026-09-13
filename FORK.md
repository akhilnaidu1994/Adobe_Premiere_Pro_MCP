# Akhil’s Premiere automation fork

Upstream: https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP
Fork: https://github.com/akhilnaidu1994/Adobe_Premiere_Pro_MCP
Baseline: ee31c3def7c3ca1c68662ea7737a9f8e5a2b634f (1.2.8).
Development package: **1.2.8-akhil.1**; CEP manifest: **1.1.7**.
Do not use the upstream npm update command to update this fork; merge upstream changes into a branch and rebuild.

The first branch, `feat/background-bridge`, adds a hidden CEP context triggered by Premiere activation. It keeps the visible panel available for configuration and diagnostics. This is a development build; Premiere startup/closure behavior is not yet live-verified. No claim of complete Premiere automation is made.

## Ownership and safety

Both contexts compete for one OS-held TCP listener on **127.0.0.1:38479**. It is a mutex, not a command transport: inbound connections are immediately closed without processing data. Commands still use the existing file bridge. Only the owner polls command files, invokes ExtendScript, and publishes heartbeats. A port conflict fails closed; it must not trigger a different port or a second command processor. Only one fork bridge can be active per machine. Other MCP implementations do not participate in this mutex and must not run against the same transport directory.

Start/Stop in the panel enable/pause both contexts using `~/.premiere-mcp-bridge/bridge-control.json`. Pause persists across reloads. The owner retains its socket while a native call is outstanding, even when a JavaScript timeout has occurred. A standby panel can pause/resume the background owner, but cannot directly run host diagnostics. Directory changes require pausing first; an owner reloads the saved directory when idle.

Before dispatching a native call, the bridge writes `bridge-native-inflight.json` beside its panel configuration. It removes the marker only after the native callback arrives. If a context disappears during a native call, a replacement blocks rather than replaying an operation with an unknown outcome. After such a failure, inspect project state and restart Premiere; remove the marker only after confirming the old native call cannot still be executing and deciding how to handle any pending command files. No automatic replay or blind retry is provided.

## Development

Use Node >=20, `npm ci --ignore-scripts`, `npm run build`, and `npm test -- --runInBand`. Ownership tests need permission to bind local loopback sockets. The source baseline is pinned; production installation and release versioning are separate from this branch.

## Required live acceptance before promotion

Use only the temporary synthetic test project; preserve the user's working edit.

1. Back up the installed Het extension. Replace it with the built fork extension using the same extension IDs; do not install duplicate IDs alongside it. Restart Premiere after saving work.
2. Without opening the visible panel, run a read-only MCP connection check. Confirm the background context starts and reads the intended project/sequence.
3. Open and close the visible panel, minimize Premiere, and switch applications. Check that requests still complete and only one instance processes each request.
4. Pause from the visible panel. Confirm all contexts stop accepting new work. Resume and confirm reconnection.
5. Exercise a slow synthetic request; pause during the request and confirm ownership remains held until the native callback returns. Do not use real edits for timeout tests.
6. Restart Codex and repeat read-only checks. Restart Premiere and repeat startup checks, including the persisted pause state.
7. Check rollback by restoring the original extension. Mark failures/unavailable observations honestly.

The automated tests cover ownership contention and transfer, standby execution/heartbeat rejection, pause while busy, and blocking replay after an uncertain native call. These tests do not prove Adobe dispatches lifecycle events or preserves a hidden renderer on every platform.

## Next stages

1. Complete live background-startup validation and improve ownership status reporting if needed.
2. Add explicit duplicate policies and independent verification to effect recipes.
3. Investigate direct Premiere export without requiring Media Encoder.
4. Apply original Malice presets through narrowly scoped UI automation, with reference comparison; do not claim static parameter copies reproduce easing.
5. Separately prove native transcription via an available UXP bridge and timed spoken fixture before implementing a workflow.

Keep changes focused and upstream merges reviewable. No changes to Malice files, production projects, or MCP installation are part of this development branch.
