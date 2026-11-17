import { describe, expect, it } from "vitest";
import { EditorSession, hitTestComponent } from "./index.js";

const project = {
  schemaVersion: 2 as const,
  id: "demo",
  name: "Demo",
  assets: [],
  components: [
    {
      id: "back",
      name: "Back",
      functionKey: "back",
      bounds: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      layers: [],
      zones: []
    },
    {
      id: "front",
      name: "Front",
      functionKey: "front",
      bounds: { x: 20, y: 20, width: 40, height: 40, rotation: 0 },
      layers: [
        { id: "background", name: "Background", order: 0, visible: true, opacity: 1 },
        { id: "overlay", name: "Overlay", order: 1, visible: true, opacity: 0.5 }
      ],
      zones: []
    }
  ],
  scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["back", "front"] }]
};

describe("EditorSession", () => {
  it("selects the topmost component at a point", () => {
    const editor = new EditorSession(project);

    expect(hitTestComponent(project, "menu", 30, 30)).toBe("front");
    expect(editor.selectAt("menu", 30, 30)).toBe("front");
    expect(editor.getState().selectedComponentIds).toEqual(["front"]);
  });

  it("updates properties and supports undo/redo", () => {
    const editor = new EditorSession(project);

    editor.updateComponent("front", { bounds: { x: 50 }, name: "Updated" });
    expect(editor.getState().project.components[1]?.bounds.x).toBe(50);
    expect(editor.getState().project.components[1]?.name).toBe("Updated");
    expect(editor.getState().canUndo).toBe(true);

    expect(editor.undo()).toBe(true);
    expect(editor.getState().project.components[1]?.bounds.x).toBe(20);
    expect(editor.redo()).toBe(true);
    expect(editor.getState().project.components[1]?.bounds.x).toBe(50);
  });

  it("rejects unknown selections and invalid bounds", () => {
    const editor = new EditorSession(project);

    expect(() => editor.selectComponents(["missing"])).toThrow("unknown component");
    expect(() => editor.updateComponent("front", { bounds: { width: -1 } }))
      .toThrow("must not be negative");
    expect(() => editor.selectAt("menu", Number.NaN, 0))
      .toThrow("finite numbers");
  });

  it("selects and updates layers with undo/redo support", () => {
    const editor = new EditorSession(project);

    editor.selectLayers("front", ["overlay"]);
    expect(editor.getState().selectedLayerIds).toEqual(["overlay"]);
    editor.updateLayer("front", "overlay", { opacity: 0.25, visible: false });
    expect(editor.getState().project.components[1]?.layers[1]?.opacity).toBe(0.25);
    expect(editor.getState().project.components[1]?.layers[1]?.visible).toBe(false);
    expect(editor.undo()).toBe(true);
    expect(editor.getState().project.components[1]?.layers[1]?.opacity).toBe(0.5);
    expect(editor.redo()).toBe(true);
    expect(editor.getState().project.components[1]?.layers[1]?.visible).toBe(false);
  });

  it("rejects unknown layer selections and updates", () => {
    const editor = new EditorSession(project);

    expect(() => editor.selectLayers("front", ["missing"])).toThrow("unknown layer");
    expect(() => editor.updateLayer("front", "missing", { visible: false }))
      .toThrow('Unknown layer "missing"');
  });
});
