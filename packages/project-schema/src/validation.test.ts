import { describe, expect, it } from "vitest";
import { migrateProjectManifest } from "./migration.js";
import { parseProjectManifest, validateProjectManifest } from "./validation.js";

const validProject = {
  schemaVersion: 2 as const,
  id: "demo",
  name: "Demo",
  assets: [
    {
      id: "button-art",
      name: "Button art",
      type: "svg" as const,
      source: "assets/button.svg"
    }
  ],
  components: [
    {
      id: "play-button",
      name: "Play button",
      functionKey: "menu.play",
      bounds: { x: 10, y: 20, width: 120, height: 48, rotation: 0 },
      layers: [
        {
          id: "base",
          name: "Base",
          order: 0,
          visible: true,
          opacity: 1,
          assetId: "button-art"
        }
      ],
      zones: [
        {
          id: "hit-area",
          name: "Hit area",
          kind: "interaction" as const,
          shape: { type: "rectangle" as const, x: 0, y: 0, width: 120, height: 48 },
          clip: false
        }
      ]
    }
  ],
  scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["play-button"] }]
};

describe("project schema", () => {
  it("accepts valid projects and resolves references", () => {
    expect(validateProjectManifest(validProject)).toEqual({ valid: true, errors: [] });
    expect(parseProjectManifest(validProject)).toEqual(validProject);
  });

  it("reports invalid references and duplicate identifiers", () => {
    const invalid = {
      ...validProject,
      assets: [...validProject.assets, validProject.assets[0]],
      scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["missing"] }]
    };

    const result = validateProjectManifest(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('assets[1].id duplicates "button-art"');
    expect(result.errors).toContain("scenes[0].rootComponentIds[0] references an unknown component");
  });

  it("migrates schema version one projects", () => {
    const legacy = {
      schemaVersion: 1 as const,
      id: "legacy",
      name: "Legacy",
      scenes: [{ id: "menu", name: "Menu", rootComponentIds: ["play-button"] }]
    };

    const migrated = migrateProjectManifest(legacy);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.components).toEqual([{
      id: "play-button",
      name: "play-button",
      functionKey: "play-button",
      bounds: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
      layers: [],
      zones: []
    }]);
    expect(migrated.scenes).toEqual(legacy.scenes);
  });

  it("rejects negative dimensions and duplicate layer identifiers", () => {
    const invalid = {
      ...validProject,
      components: [{
        ...validProject.components[0],
        bounds: { ...validProject.components[0].bounds, width: -1 },
        layers: [
          ...validProject.components[0].layers,
          validProject.components[0].layers[0]
        ]
      }]
    };

    const result = validateProjectManifest(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("components[0].bounds.width must not be negative");
    expect(result.errors).toContain('components[0].layers[1].id duplicates "base"');
  });
});
