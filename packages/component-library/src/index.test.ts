import { describe, expect, it } from "vitest";
import { ComponentLibrary } from "./index.js";

const entry = {
  component: {
    id: "button",
    name: "Button",
    functionKey: "menu.play",
    bounds: { x: 0, y: 0, width: 100, height: 40, rotation: 0 },
    layers: [{
      id: "base",
      name: "Base",
      order: 0,
      visible: true,
      opacity: 1,
      assetId: "button-art"
    }],
    zones: []
  },
  assets: [{
    id: "button-art",
    name: "Button art",
    type: "svg" as const,
    source: "button.svg"
  }]
};

describe("ComponentLibrary", () => {
  it("exports and imports a validated component ZIP with asset bytes", () => {
    const library = new ComponentLibrary();
    library.add(entry);

    const zip = library.exportZip("button", {
      "button-art": new Uint8Array([1, 2, 3])
    });
    const imported = library.importZip(zip);

    expect(imported.component.id).toBe("button");
    expect([...imported.assetData["button-art"]]).toEqual([1, 2, 3]);
  });

  it("rejects unknown components and missing manifests", () => {
    const library = new ComponentLibrary();

    expect(() => library.exportZip("missing")).toThrow("Unknown library component");
    expect(() => library.importZip(new Uint8Array([1, 2, 3]))).toThrow("ZIP is invalid");
  });
});
