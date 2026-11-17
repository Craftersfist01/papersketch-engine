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

## Commands

```text
npm install
npm run typecheck
npm test
npm run build
```

The editor and renderer implementations are intentionally deferred to later phases.

