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

  it("rejects executable asset sources", () => {
    const renderer = new SvgRenderer(
      { setMarkup: () => undefined },
      {
        width: 100,
        height: 100,
        assetStore: {
          get: () => ({
            definition: {
              id: "asset",
              name: "Asset",
              type: "svg",
              source: "javascript:alert(1)"
            },
            data: undefined
          }),
          load: async () => {
            throw new Error("not used");
          },
          preload: async () => [],
          clear: () => undefined
        }
      }
    );

    expect(() => renderer.render({
      projectId: "demo",
      deltaMs: 0,
      elapsedMs: 0,
      components: [{
        id: "component",
        state: "normal",
        definition: {
          id: "component",
          name: "Component",
          functionKey: "demo",
          bounds: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
          layers: [{
            id: "layer",
            name: "Layer",
            order: 0,
            visible: true,
            opacity: 1,
            assetId: "asset"
          }],
          zones: []
        }
      }]
    })).toThrow("Unsafe SVG asset source");
  });

  it("renders brush marks and masks eraser marks in the drawing layer", () => {
    let markup = "";
    const renderer = new SvgRenderer(
      { setMarkup: (value) => { markup = value; } },
      { width: 100, height: 100 }
    );

    renderer.render({
      projectId: "demo",
      deltaMs: 0,
      elapsedMs: 0,
      components: [],
      strokes: [{
        id: "pencil",
        seed: 1,
        brush: { kind: "pencil", size: 4, opacity: 1, density: 1, color: "#123456" },
        points: [{ x: 10, y: 20, pressure: 1, tiltX: 10, tiltY: 0, timeMs: 0 }]
      }, {
        id: "eraser",
        seed: 2,
        brush: { kind: "eraser", size: 6, opacity: 0, density: 1 },
        points: [{ x: 15, y: 20, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 0 }]
      }]
    });

    expect(markup).toContain('data-layer="drawing" mask="url(#drawing-erase-mask)"');
    expect(markup).toContain('data-stroke-id="pencil"');
    expect(markup).toContain('<mask id="drawing-erase-mask"');
    expect(markup).toContain('fill="#123456"');
  });

  it("rejects unsafe drawing colors", () => {
    const renderer = new SvgRenderer(
      { setMarkup: () => undefined },
      { width: 100, height: 100 }
    );

    expect(() => renderer.render({
      projectId: "demo",
      deltaMs: 0,
      elapsedMs: 0,
      components: [],
      strokes: [{
        id: "unsafe",
        seed: 1,
        brush: { kind: "pencil", size: 4, opacity: 1, density: 1, color: "url(javascript:alert(1))" },
        points: [{ x: 10, y: 20, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 0 }]
      }]
    })).toThrow("Unsafe drawing color");
  });
});
