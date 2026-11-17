# Changelog

## 0.1.0 - 2026-11-17

### Added

- Complete 14-phase PaperSketch Engine foundation.
- Versioned project schema, migration, runtime, scenes, and deterministic ticks.
- Asset store, Canvas/SVG renderers, input normalization, drawing, animation,
  editor core, component library, and editor UI models.
- Game SDK with typed events and state.
- Transport-neutral networking and iPad preview bridge.
- Browser WebSocket transport, tokenized Node LAN host, and QR connection data.
- Framework-neutral and browser DOM connection UI adapters.
- End-to-end reference game with synchronized active/final strokes.
- `npm run release:check` for typecheck, tests, and build.

## Unreleased

### Changed

- Separated the browser WebSocket transport from the Node-only LAN host.
- Added payload size limits and optional structured network error handling.
- Added token-strength and constant-time token checks for the LAN host.
- Added ZIP path, archive-size, and SVG source safety validation.
- Added iPad preview and pointer payload validation.

### Validation

- 17 test files
- 41 passing tests
- TypeScript project-reference typecheck passed
- Production build passed
