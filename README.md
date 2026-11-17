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
