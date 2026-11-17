export const PROJECT_SCHEMA_VERSION = 1 as const;

export interface ProjectManifest {
  readonly schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly scenes: readonly SceneDefinition[];
}

export interface SceneDefinition {
  readonly id: string;
  readonly name: string;
  readonly rootComponentIds: readonly string[];
}

