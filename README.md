# PaperSketch Engine

PaperSketch Engine is a TypeScript foundation for hand-drawn games, interfaces, and interactive applications.

## Phase 1

This phase establishes:

- a workspace-based package layout;
- versioned project contracts;
- a renderer-agnostic engine core boundary;
- a runtime package that does not depend on editor code;
- repeatable type-checking, builds, and tests.

Phase 2 adds a versioned project schema for components, layers, zones, and assets,
including reference validation and migration from schema version 1. Phase 3 adds
scene loading, component instances, runtime lifecycle, and deterministic render ticks.
Phase 4 adds cached asset loading plus Canvas and SVG renderer packages.
Phase 5 adds device-normalized pointer samples and deterministic brush mark generation.
Phase 6 adds deterministic animation scheduling and rectangle/circle/path clipping
support for the renderers.
Phase 7 adds framework-neutral editor selection, property editing, hit testing,
and undo/redo.
Phase 8 adds validated component bundles with ZIP import/export and a UI-neutral
property-panel model.
Phase 9 adds typed game events/state plus a transport-neutral iPad bridge with
full-screen preview synchronization and PC-controlled drawing style.

## Commands

```text
npm install
npm run typecheck
npm test
npm run build
```

The editor and renderer implementations are intentionally deferred to later phases.

