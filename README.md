# PaperSketch Engine

[![Release](https://img.shields.io/github/v/release/Craftersfist01/papersketch-engine?display_name=tag)](https://github.com/Craftersfist01/papersketch-engine/releases/latest)

PaperSketch Engine is a modular TypeScript foundation for hand-drawn games,
interactive interfaces, and remote tablet drawing workflows. It separates
serializable project data, runtime execution, rendering, editing, networking,
and device-specific adapters.

**Current release:** [v0.1.0](https://github.com/Craftersfist01/papersketch-engine/releases/tag/v0.1.0)

> **Status:** The engine foundation is complete. The repository currently ships
> tested library packages, browser/LAN connection adapters, and an end-to-end
> reference game. A production editor shell and deployment-specific camera
> integration remain application-level work.

## What is included

- Versioned project schema with validation, reference checks, and migration.
- Runtime scenes, component instances, deterministic ticks, animation, and
  renderer-neutral `RenderFrame` contracts.
- Cached asset loading plus Canvas and SVG renderers.
- Normalized pointer input and deterministic seeded brush generation.
- Editor selection, hit testing, property editing, and undo/redo.
- Validated component ZIP bundles with optional embedded assets.
- Typed Game SDK events and state.
- iPad full-screen preview with committed and active stroke synchronization.
- Browser-compatible WebSocket transport and token-protected Node LAN host.
- QR-ready connection descriptors and browser connection UI models.
- QR rendering, camera-scanner adapter, and live preview canvas binding.
- End-to-end reference game and a reproducible release verification command.

## Package map

| Package | Responsibility |
| --- | --- |
| `@papersketch/project-schema` | Versioned project contracts, validation, and migration |
| `@papersketch/engine-core` | Runtime-neutral scenes, components, and renderer ports |
| `@papersketch/runtime` | Project loading, lifecycle, scene activation, and ticks |
| `@papersketch/assets` | Cached and deduplicated asset loading |
| `@papersketch/renderer-canvas` | Canvas 2D rendering and clipping |
| `@papersketch/renderer-svg` | SVG rendering, asset references, and clipping |
| `@papersketch/input` | Device-independent pointer normalization |
| `@papersketch/drawing` | Serializable strokes and deterministic brush marks |
| `@papersketch/animation` | Renderer-neutral animation scheduling |
| `@papersketch/editor` | Editing state, hit testing, and undo/redo |
| `@papersketch/editor-ui` | Framework-neutral property-panel models |
| `@papersketch/component-library` | Validated component bundle import/export |
| `@papersketch/networking` | Versioned JSON envelopes and transport contract |
| `@papersketch/ipad-bridge` | PC-to-iPad preview and normalized pointer messages |
| `@papersketch/game-sdk` | Typed event bus and mutable game state |
| `@papersketch/websocket-transport` | Browser-compatible WebSocket adapter and connection descriptors |
| `@papersketch/websocket-host` | Node-only token-protected LAN WebSocket host |
| `@papersketch/connection-ui` | QR, connect-flow, camera-scan, and preview UI adapters |
| `@papersketch/reference-game` | End-to-end integration sample |

## Quick start

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run release:check
```

The release check runs the complete typecheck, test suite, and production
build. Individual commands are also available:

```bash
npm run typecheck
npm test
npm run build
```

## iPad connection flow

1. The PC creates a tokenized `ConnectionDescriptor`.
2. The LAN WebSocket host validates the token during the upgrade request.
3. The host UI renders the `papersketch://connect?...` payload as a QR code.
4. The iPad scanner parses the payload and opens the WebSocket connection.
5. The host sends full-screen preview state, including PC-selected color,
   tool, brush size, committed strokes, and the active stroke.
6. The iPad sends only normalized pointer coordinates, pressure, and tilt.

The transport and UI layers are adapter-based. A browser camera implementation,
desktop shell, or framework can be supplied without changing the engine core.

## Phase history

All planned foundation and integration phases are complete:

1. Monorepo foundation
2. Project schema and migration
3. Runtime and scenes
4. Assets and renderers
5. Input and deterministic drawing
6. Animation and clipping
7. Editor core
8. Component library and editor UI models
9. Game SDK and transport-neutral iPad bridge
10. Browser WebSocket transport and QR-ready descriptors
11. Tokenized Node LAN host
12. Host/iPad connection-flow models
13. Browser QR, scanner, and live preview adapters
14. End-to-end reference game and release verification
15. Browser/Node transport separation and security hardening

## Current release boundary

The engine packages and integration sample are released as a library
foundation. A production application still needs a chosen browser or desktop
shell, camera permissions, deployment configuration, and a concrete visual
editor application. Those concerns intentionally remain outside the core
packages.

See [docs/architecture.md](docs/architecture.md) for dependency boundaries
and [CHANGELOG.md](CHANGELOG.md) for the visible release history.
