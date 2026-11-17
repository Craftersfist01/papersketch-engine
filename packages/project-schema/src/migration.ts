import { PROJECT_SCHEMA_VERSION, type ProjectManifest } from "./index.js";
import { parseProjectManifest } from "./validation.js";

interface LegacyProjectManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  readonly scenes: ProjectManifest["scenes"];
}

function isLegacyProjectManifest(input: unknown): input is LegacyProjectManifest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }

  const value = input as Record<string, unknown>;
  return value.schemaVersion === 1
    && typeof value.id === "string"
    && typeof value.name === "string"
    && Array.isArray(value.scenes);
}

export function migrateProjectManifest(input: unknown): ProjectManifest {
  if (isLegacyProjectManifest(input)) {
    const componentIds = new Set(
      input.scenes.flatMap((scene) => scene.rootComponentIds)
    );
    return parseProjectManifest({
      ...input,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      components: [...componentIds].map((id) => ({
        id,
        name: id,
        functionKey: id,
        bounds: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
        layers: [],
        zones: []
      })),
      assets: []
    });
  }

  return parseProjectManifest(input);
}
