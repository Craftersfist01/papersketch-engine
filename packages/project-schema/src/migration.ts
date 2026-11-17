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
    return parseProjectManifest({
      ...input,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      components: [],
      assets: []
    });
  }

  return parseProjectManifest(input);
}
