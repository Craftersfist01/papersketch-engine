export const PROJECT_SCHEMA_VERSION = 2 as const;

export type AssetType = "svg" | "png" | "webp" | "jpeg" | "canvas";

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export interface AssetDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: AssetType;
  readonly source: string;
  readonly hash?: string;
}

export interface LayerDefinition {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly visible: boolean;
  readonly opacity: number;
  readonly assetId?: string;
}

export type ZoneShape =
  | {
      readonly type: "rectangle";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly type: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly radius: number;
    }
  | {
      readonly type: "path";
      readonly data: string;
    };

export interface ZoneDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: "effect" | "text" | "drawing" | "interaction" | "mask";
  readonly shape: ZoneShape;
  readonly clip: boolean;
}

export interface ComponentDefinition {
  readonly id: string;
  readonly name: string;
  readonly functionKey: string;
  readonly bounds: Bounds;
  readonly layers: readonly LayerDefinition[];
  readonly zones: readonly ZoneDefinition[];
}

export interface ProjectManifest {
  readonly schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly scenes: readonly SceneDefinition[];
  readonly components: readonly ComponentDefinition[];
  readonly assets: readonly AssetDefinition[];
}

export interface SceneDefinition {
  readonly id: string;
  readonly name: string;
  readonly rootComponentIds: readonly string[];
}

export { migrateProjectManifest } from "./migration.js";
export {
  isProjectManifest,
  parseProjectManifest,
  validateProjectManifest,
  type ValidationResult
} from "./validation.js";

