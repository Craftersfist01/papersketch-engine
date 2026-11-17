import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "./index.js";

describe("createRuntime", () => {
  it("renders once when started and does not depend on editor code", () => {
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
    expect(renderer.render).toHaveBeenCalledWith(project);
  });
});
