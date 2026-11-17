# Architecture

## Boundaries

`project-schema` contains serializable project contracts and must remain independent of browser APIs.

`engine-core` owns runtime-neutral engine contracts such as clocks, scenes, and rendering ports. It must not import editor code or concrete rendering libraries.

`runtime` assembles a project with an engine host. It is the integration boundary for applications and later renderers.

The visual editor, renderer implementations, asset storage, networking, and reference game will be added as separate packages in later phases.

## Initial decisions

1. TypeScript project references provide explicit package boundaries.
2. JSON-compatible data structures are versioned at the project boundary.
3. Concrete rendering is accessed through ports so Canvas 2D and SVG remain replaceable.
4. Runtime code must be usable without shipping the editor.
5. Browser- and device-specific services will be hidden behind adapters.

## Planned dependency direction

```text
project-schema <- engine-core <- runtime
                         ^          ^
                         |          |
                   renderers      applications
```

Editor packages may depend on the schema and runtime contracts, but the runtime must never depend on the editor.

