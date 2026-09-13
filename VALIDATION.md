# Development validation — 13 September 2026

Build: `npm run build` passed for 1.2.8-akhil.1.

Bridge regression run: 13 suites, 135 tests passed. Command:

```sh
npm test -- --runInBand src/__tests__/bridge --testPathIgnorePatterns='bridge-injection.test.ts|/[.]_'
```

The exhaustive `bridge-injection.test.ts` was already running in a separate full-suite attempt. Do not interpret this bounded bridge regression run as a clean full-suite result. The first full run also encountered a prototype-only test fixture missing the new ownership state; that fixture was updated and passes in the run above. AppleDouble metadata files on the external drive were excluded from test discovery and TypeScript inputs after they caused binary-file discovery errors.

A stdio MCP initialization and tools/list call against the fork's compiled server succeeded and returned 283 tools under the full toolset. The package archive contains the compiled server, background manifest, ownership module, and fork documentation.

Live Premiere background startup, hidden-context lifetime, close/reopen behavior, and rollback acceptance remain **unverified**. No fork extension or server was installed over the working upstream installation. Follow FORK.md before promotion.
