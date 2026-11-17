import { describe, expect, it, vi } from "vitest";
import { CanvasRenderer } from "./index.js";

describe("CanvasRenderer", () => {
  it("clears the surface and renders visible layers in order", () => {
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      globalAlpha: 1,
      fillStyle: ""
    };
    const renderer = new CanvasRenderer(context, { width: 800, height: 600 });

    renderer.render({
      projectId: "demo",
      sceneId: "menu",
      deltaMs: 16,
      elapsedMs: 16,
      components: [
        {
          id: "button",
          state: "normal",
          definition: {
            id: "button",
            name: "Button",
            functionKey: "menu.play",
            bounds: { x: 10, y: 20, width: 100, height: 40, rotation: 0 },
            layers: [
              { id: "hidden", name: "Hidden", order: 0, visible: false, opacity: 1 },
              { id: "base", name: "Base", order: 1, visible: true, opacity: 0.8 }
            ],
            zones: [{
              id: "clip",
              name: "Clip",
              kind: "mask" as const,
              shape: { type: "rectangle" as const, x: 0, y: 0, width: 80, height: 30 },
              clip: true
            }]
          }
        }
      ]
    });

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(context.translate).toHaveBeenCalledWith(10, 20);
    expect(context.rect).toHaveBeenCalledWith(0, 0, 80, 30);
    expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 100, 40);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });
});
