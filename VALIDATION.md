# Development validation — 13 September 2026

Build: `npm run build` passed for 1.2.8-akhil.1.

Bridge regression run: 13 suites, 135 tests passed. Command:

```sh
npm test -- --runInBand src/__tests__/bridge --testPathIgnorePatterns='bridge-injection.test.ts|/[.]_'
```

The exhaustive `bridge-injection.test.ts` was already running in a separate full-suite attempt. Do not interpret this bounded bridge regression run as a clean full-suite result. The first full run also encountered a prototype-only test fixture missing the new ownership state; that fixture was updated and passes in the run above. AppleDouble metadata files on the external drive were excluded from test discovery and TypeScript inputs after they caused binary-file discovery errors.

A stdio MCP initialization and tools/list call against the fork's compiled server succeeded and returned 283 tools under the full toolset. The package archive contains the compiled server, background manifest, ownership module, and fork documentation.

Live Premiere background startup, hidden-context lifetime, close/reopen behavior, and rollback acceptance remain **unverified**. No fork extension or server was installed over the working upstream installation. Follow FORK.md before promotion.

## Final regression and local installation

The final full-suite attempt completed in 144.21 seconds: 32 suites passed, one suite failed; 658 tests passed and one version-stamp consistency test failed. `src/version.ts` was corrected to 1.2.8-akhil.1; the entire update-check suite then passed. The latest ownership/heartbeat run also passed (2 suites, 10 tests). The exhaustive injection test was corrected to exclude host discovery/startup lifecycle methods, and completed in the final full run. A single all-green full rerun after the version-only fix was not performed.

At the user's explicit request, the globally installed upstream server was replaced with 1.2.8-akhil.1, and the upstream panel was replaced with the matching `AkhilPremiereMCP` extension. The installed server initialized over stdio and returned 283 tools. Every installed panel file matched the package. Codex connection configuration was preserved byte-for-byte. The old leancoder global package remains absent.

Rollback copies of the upstream package, panel and connection settings were saved locally before replacement. Premiere and Codex must reload before the new runtime can be verified. No project edits were performed during installation. Live background-startup acceptance remains pending.
