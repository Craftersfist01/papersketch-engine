import { describe, expect, it } from "vitest";
import { EditorSession } from "@papersketch/editor";
import { createPropertyPanelModel } from "./index.js";

const project = {
  schemaVersion: 2 as const,
  id: "demo",
  name: "Demo",
  assets: [],
  components: [{
    id: "button",
    name: "Button",
    functionKey: "menu.play",
    bounds: { x: 1, y: 2, width: 3, height: 4, rotation: 5 },
    layers: [],
    zones: []
  }],
  scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["button"] }]
};

describe("property panel model", () => {
  it("exposes fields for exactly one selected component", () => {
    const editor = new EditorSession(project);
    editor.selectComponents(["button"]);

    const panel = createPropertyPanelModel(editor.getState());

    expect(panel.selectedComponentId).toBe("button");
    expect(panel.fields).toHaveLength(7);
    expect(panel.fields.find((field) => field.key === "width")?.value).toBe(3);
  });

  it("does not expose properties without a single selection", () => {
    const editor = new EditorSession(project);
    editor.selectComponents(["button"]);
    const panel = createPropertyPanelModel(editor.getState());

    expect(panel.fields).not.toHaveLength(0);
    editor.selectComponents([]);
    expect(createPropertyPanelModel(editor.getState()).fields).toEqual([]);
  });
});
