import { describe, expect, it } from "vitest";
import { SvgRenderer } from "./index.js";

describe("SvgRenderer", () => {
  it("writes deterministic SVG markup with component metadata", () => {
    let markup = "";
    const renderer = new SvgRenderer(
      { setMarkup: (value) => { markup = value; } },
      { width: 800, height: 600 }
    );

    renderer.render({
      projectId: "demo",
      sceneId: "menu",
      deltaMs: 0,
      elapsedMs: 0,
      components: [
        {
          id: "button<&",
          state: "normal",
          definition: {
            id: "button<&",
            name: "Button",
            functionKey: "menu.play",
            bounds: { x: 10, y: 20, width: 100, height: 40, rotation: 5 },
            layers: [],
            zones: [{
              id: "mask",
              name: "Mask",
              kind: "mask" as const,
              shape: { type: "circle" as const, cx: 50, cy: 20, radius: 20 },
              clip: true
            }]
          }
        }
      ]
    });

    expect(markup).toContain('data-project-id="demo"');
    expect(markup).toContain('data-component-id="button&lt;&amp;"');
    expect(markup).toContain('transform="translate(10 20) rotate(5)"');
    expect(markup).toContain('<defs><clipPath id="clip-0"><circle cx="50" cy="20" r="20"/></clipPath></defs>');
    expect(markup).toContain('clip-path="url(#clip-0)"');
  });
});
