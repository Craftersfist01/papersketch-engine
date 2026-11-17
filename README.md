# PaperSketch Engine

[![Release](https://img.shields.io/github/v/release/Craftersfist01/papersketch-engine?display_name=tag)](https://github.com/Craftersfist01/papersketch-engine/releases/latest)

**PaperSketch Engine** is a modular, TypeScript-based foundation for hand-drawn games, interactive interfaces, and creative browser experiences.

It combines a renderer-independent project/runtime architecture with Canvas 2D and SVG rendering, deterministic drawing primitives, editable project data, reusable component bundles, animation scheduling, and a PC-to-iPad drawing connection.

The project is designed to grow into a complete visual game-authoring environment. The current **v0.1.0** release provides the core libraries and integration foundations; it is not yet a finished visual editor or a complete game-making application.

## What it is for

PaperSketch separates a game's logic from its visual presentation. A game can define scenes, components, stable function keys, and serializable project data. PaperSketch packages provide rendering, input normalization, drawing data, animation timing, editing primitives, component import/export, and device/network adapters.

The first reference use case is a creative drawing game: players receive unusual random word combinations, interpret them on a canvas, and can eventually share drawings or play drawing-based party modes. The engine itself remains game-agnostic and is intended to support other genres and interactive applications.

## Current capabilities

### Project model and runtime
- Versioned project manifest (schema version 2).
- Schema validation, reference checks, and migration from schema version 1.
- Serializable scenes, component definitions, bounds, layers, zones, and asset references.
- Renderer-neutral engine contracts and runtime lifecycle.
- Scene activation, component instances, deterministic runtime ticks, and render-frame contracts.

### Rendering and assets
- Canvas 2D renderer for project components and assets.
- SVG renderer with generated markup and clipping for rectangle, circle, and path zones.
- Cached, deduplicated asset-loading abstraction.
- Asset metadata supports SVG, PNG, WebP, JPEG, and Canvas asset types.
- Layer visibility, ordering, opacity, bounds, and rotation are represented in the project/rendering pipeline.

### Input and drawing foundations
- Device-independent pointer normalization for mouse, touch, pen, and unknown pointer sources.
- Normalized pressure, tilt, buttons, coordinates, and timestamps.
- Serializable stroke and brush definitions.
- Deterministic seeded brush-mark generation with pressure, density, size, and opacity influence.
- Brush profiles include pencil, soft pencil, hard pencil, charcoal, fineliner, and eraser types.

### Animation, zones, and editing primitives
- Renderer-independent animation scheduler supporting looping and one-shot timing.
- Project zones for effect, text, drawing, interaction, and masking purposes.
- Canvas clipping for rectangle and circle zones.
- SVG clipping for rectangle, circle, and free-path zones.
- Framework-neutral editor state for selection, multi-selection, hit testing, property editing, and undo/redo.
- Framework-neutral property-panel models.

### Reusable components
- Schema-validated component and asset bundles.
- Versioned ZIP import/export with optional embedded asset bytes.
- Component function keys are stored separately from visual layer/asset data, supporting the separation between behavior and appearance.

### Game and iPad/LAN integration
- Typed game event bus and game-state primitives.
- Versioned JSON network envelopes and a transport abstraction.
- iPad preview bridge for synchronizing committed and active strokes.
- PC-controlled drawing style values (color, tool, and brush size) mirrored to the iPad preview.
- Normalized pointer coordinates, pressure, and tilt sent from the iPad bridge to the host.
- Browser WebSocket client transport.
- Node.js LAN WebSocket host with connection-token validation.
- Versioned, QR-ready connection descriptors.
- Host/iPad connection-flow models, QR rendering, injectable camera-scanner adapter, and canvas preview binding.
- End-to-end reference-game package connecting runtime, game state, drawing primitives, and the iPad bridge.

## Package overview

| Package | Purpose |
| --- | --- |
| `@papersketch/project-schema` | Versioned project contracts, validation, and migration |
| `@papersketch/engine-core` | Runtime-neutral scenes, components, clocks, and renderer contracts |
| `@papersketch/runtime` | Project runtime lifecycle, scene activation, and ticks |
| `@papersketch/assets` | Cached and deduplicated asset loading |
| `@papersketch/renderer-canvas` | Canvas 2D rendering and basic clipping |
| `@papersketch/renderer-svg` | SVG rendering and path-capable zone clipping |
| `@papersketch/input` | Pointer normalization |
| `@papersketch/drawing` | Serializable strokes and deterministic brush marks |
| `@papersketch/animation` | Deterministic animation scheduler |
| `@papersketch/editor` | Selection, hit testing, property updates, and history |
| `@papersketch/editor-ui` | Framework-neutral property-panel models |
| `@papersketch/component-library` | Validated component bundle ZIP import/export |
| `@papersketch/game-sdk` | Typed game events and state |
| `@papersketch/networking` | Versioned envelopes and transport contracts |
| `@papersketch/ipad-bridge` | iPad preview and normalized pointer bridge |
| `@papersketch/websocket-transport` | WebSocket transport and tokenized Node LAN host |
| `@papersketch/connection-ui` | QR/connect-flow and browser preview adapters |
| `@papersketch/reference-game` | End-to-end integration example |

## Quick start

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run release:check
```

The release check runs TypeScript project-reference checking, the Vitest suite, and the TypeScript build.

Individual commands:

```bash
npm run typecheck
npm test
npm run build
```

## iPad connection architecture

The current implementation provides the connection and synchronization building blocks:

1. The PC-side host creates a versioned connection descriptor containing a WebSocket URL and token.
2. The LAN host validates the token during the WebSocket upgrade.
3. The host UI can render the descriptor as a QR code.
4. The iPad-side flow parses the descriptor and passes the connection URL to an injected connector.
5. The preview bridge synchronizes canvas dimensions, drawing style, committed strokes, and the active stroke.
6. Normalized pointer events from the iPad are delivered to the host-side reference-game logic.

The scanner is adapter-based: the browser UI accepts an injected barcode detector/scanner implementation. Actual camera permissions, a concrete browser application shell, trusted deployment context, firewall configuration, and device-specific browser testing depend on the host application and environment.

The current LAN host is a Node.js service. A static GitHub Pages site alone cannot host that service.

## Architecture principles

- **Game-agnostic core:** game-specific rules remain outside the engine packages.
- **Serializable project data:** project structure is represented by versioned JSON-compatible contracts.
- **Behavior separated from appearance:** component function keys are distinct from visual layers and assets.
- **Renderer independence:** runtime code targets a renderer contract rather than a specific drawing backend.
- **Editor/runtime separation:** the runtime does not require the visual editor.
- **Adapter-based platform integration:** browser, camera, network, and device-specific APIs are kept at integration boundaries.
- **Reproducibility:** seeded brush generation and deterministic runtime/animation timing support repeatable tests.

## Current scope and limitations

PaperSketch Engine v0.1.0 is a tested library and integration foundation. The following larger product-level features remain future work and should not be mistaken for completed functionality:

- A complete visual editor application with a full canvas workspace, drawing tools, drag/resize handles, and a polished inspector.
- A production-grade graphite renderer with realistic paper-grain compositing, pressure/tilt dynamics, and refined pencil/charcoal brush profiles.
- Full Canvas path-mask clipping and richer per-layer/per-state effect routing.
- A visual animation editor for authoring and combining interaction effects such as irregular, clipped button ripples.
- A complete project preview/application shell that discovers and edits game UI placeholders through a stable authoring integration.
- A polished iPad drawing-pad web application, including concrete camera scanning and end-to-end browser/device validation.
- Automatic runtime asset optimization, responsive asset variants, and production performance profiling.
- The complete multiplayer word-drawing party game, public gallery, accounts, moderation, and persistent backend.

These are planned extensions. The current packages provide foundations for several of them, not finished implementations.

## Development

The repository is organized as an npm workspace monorepo under `packages/*`.

Useful commands:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run release:check
```

See [docs/architecture.md](docs/architecture.md) for package boundaries and [CHANGELOG.md](CHANGELOG.md) for release history.

## Release

Current release: [v0.1.0](https://github.com/Craftersfist01/papersketch-engine/releases/tag/v0.1.0).

The v0.1.0 changelog records 17 test files and 41 passing tests at release time. Run `npm run release:check` on the current checkout to verify the present state locally.
