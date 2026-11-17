import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "./index.js";

describe("createRuntime", () => {
  it("renders an initial frame once when started", () => {
    const renderer = { render: vi.fn() };
    const project = {
      schemaVersion: 2 as const,
      id: "demo",
      name: "Demo",
      scenes: [],
      components: [],
      assets: []
    };
    const runtime = createRuntime(project, renderer);

    runtime.start();
    runtime.start();

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledWith({
      projectId: "demo",
      components: [],
      deltaMs: 0,
      elapsedMs: 0
    });
  });

  it("instantiates the active scene and renders deterministic ticks", () => {
    const renderer = { render: vi.fn() };
    const project = {
      schemaVersion: 2 as const,
      id: "demo",
      name: "Demo",
      assets: [],
      components: [
        {
          id: "play",
          name: "Play",
          functionKey: "menu.play",
          bounds: { x: 0, y: 0, width: 100, height: 40, rotation: 0 },
          layers: [],
          zones: []
        }
      ],
      scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["play"] }]
    };
    const runtime = createRuntime(project, renderer);

    runtime.start();
    runtime.tick(16);

    expect(runtime.activeSceneId).toBe("menu");
    expect(runtime.getActiveScene()?.components[0]?.state).toBe("normal");
    expect(renderer.render).toHaveBeenLastCalledWith({
      projectId: "demo",
      sceneId: "menu",
      components: expect.any(Array),
      deltaMs: 16,
      elapsedMs: 16
    });
  });

  it("rejects invalid scene loads and invalid tick durations", () => {
    const renderer = { render: vi.fn() };
    const project = {
      schemaVersion: 2 as const,
      id: "demo",
      name: "Demo",
      scenes: [],
      components: [],
      assets: []
    };
    const runtime = createRuntime(project, renderer);

    expect(() => runtime.loadScene("missing")).toThrow('Unknown scene "missing"');
    runtime.start();
    expect(() => runtime.tick(-1)).toThrow("deltaMs must be a non-negative finite number");
  });
});
