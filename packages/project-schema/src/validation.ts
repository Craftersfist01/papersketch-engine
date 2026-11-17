import {
  PROJECT_SCHEMA_VERSION,
  type AssetDefinition,
  type AssetType,
  type Bounds,
  type ComponentDefinition,
  type LayerDefinition,
  type ProjectManifest,
  type SceneDefinition,
  type ZoneDefinition,
  type ZoneShape
} from "./index.js";

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const ASSET_TYPES: readonly AssetType[] = ["svg", "png", "webp", "jpeg", "canvas"];
const ZONE_KINDS = ["effect", "text", "drawing", "interaction", "mask"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateBounds(value: unknown, path: string, errors: string[]): value is Bounds {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  for (const key of ["x", "y", "width", "height", "rotation"]) {
    if (!isFiniteNumber(value[key])) {
      errors.push(`${path}.${key} must be a finite number`);
    }
  }
  if (isFiniteNumber(value.width) && value.width < 0) {
    errors.push(`${path}.width must not be negative`);
  }
  if (isFiniteNumber(value.height) && value.height < 0) {
    errors.push(`${path}.height must not be negative`);
  }

  return true;
}

function validateZoneShape(value: unknown, path: string, errors: string[]): value is ZoneShape {
  if (!isRecord(value) || typeof value.type !== "string") {
    errors.push(`${path} must define a shape type`);
    return false;
  }

  if (value.type === "rectangle") {
    for (const key of ["x", "y", "width", "height"]) {
      if (!isFiniteNumber(value[key])) {
        errors.push(`${path}.${key} must be a finite number`);
      }
    }
    if (isFiniteNumber(value.width) && value.width < 0) {
      errors.push(`${path}.width must not be negative`);
    }
    if (isFiniteNumber(value.height) && value.height < 0) {
      errors.push(`${path}.height must not be negative`);
    }
    return true;
  }

  if (value.type === "circle") {
    for (const key of ["cx", "cy", "radius"]) {
      if (!isFiniteNumber(value[key])) {
        errors.push(`${path}.${key} must be a finite number`);
      }
    }
    if (isFiniteNumber(value.radius) && value.radius < 0) {
      errors.push(`${path}.radius must not be negative`);
    }
    return true;
  }

  if (value.type === "path") {
    if (!isString(value.data)) {
      errors.push(`${path}.data must be a non-empty string`);
    }
    return true;
  }

  errors.push(`${path}.type is unsupported`);
  return false;
}

function validateLayer(value: unknown, path: string, errors: string[]): value is LayerDefinition {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (!isString(value.id)) errors.push(`${path}.id must be a non-empty string`);
  if (!isString(value.name)) errors.push(`${path}.name must be a non-empty string`);
  if (!isFiniteNumber(value.order)) errors.push(`${path}.order must be a finite number`);
  if (typeof value.visible !== "boolean") errors.push(`${path}.visible must be boolean`);
  if (!isFiniteNumber(value.opacity) || value.opacity < 0 || value.opacity > 1) {
    errors.push(`${path}.opacity must be between 0 and 1`);
  }
  if (value.assetId !== undefined && !isString(value.assetId)) {
    errors.push(`${path}.assetId must be a non-empty string when provided`);
  }

  return true;
}

function validateZone(value: unknown, path: string, errors: string[]): value is ZoneDefinition {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (!isString(value.id)) errors.push(`${path}.id must be a non-empty string`);
  if (!isString(value.name)) errors.push(`${path}.name must be a non-empty string`);
  if (!ZONE_KINDS.includes(value.kind as ZoneDefinition["kind"])) {
    errors.push(`${path}.kind is unsupported`);
  }
  validateZoneShape(value.shape, `${path}.shape`, errors);
  if (typeof value.clip !== "boolean") errors.push(`${path}.clip must be boolean`);

  return true;
}

function validateComponent(
  value: unknown,
  path: string,
  errors: string[],
  assetIds: ReadonlySet<string>
): value is ComponentDefinition {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (!isString(value.id)) errors.push(`${path}.id must be a non-empty string`);
  if (!isString(value.name)) errors.push(`${path}.name must be a non-empty string`);
  if (!isString(value.functionKey)) errors.push(`${path}.functionKey must be a non-empty string`);
  validateBounds(value.bounds, `${path}.bounds`, errors);

  if (!Array.isArray(value.layers)) {
    errors.push(`${path}.layers must be an array`);
  } else {
    value.layers.forEach((layer, index) => {
      validateLayer(layer, `${path}.layers[${index}]`, errors);
      if (isRecord(layer) && layer.assetId !== undefined && !assetIds.has(String(layer.assetId))) {
        errors.push(`${path}.layers[${index}].assetId references an unknown asset`);
      }
    });
    validateUniqueIds(value.layers, `${path}.layers`, errors);
  }

  if (!Array.isArray(value.zones)) {
    errors.push(`${path}.zones must be an array`);
  } else {
    value.zones.forEach((zone, index) => validateZone(zone, `${path}.zones[${index}]`, errors));
    validateUniqueIds(value.zones, `${path}.zones`, errors);
  }

  return true;
}

function validateScene(value: unknown, path: string, componentIds: ReadonlySet<string>, errors: string[]): value is SceneDefinition {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  if (!isString(value.id)) errors.push(`${path}.id must be a non-empty string`);
  if (!isString(value.name)) errors.push(`${path}.name must be a non-empty string`);
  if (!Array.isArray(value.rootComponentIds)) {
    errors.push(`${path}.rootComponentIds must be an array`);
  } else {
    const rootIds = new Set<string>();
    value.rootComponentIds.forEach((id, index) => {
      if (!isString(id)) {
        errors.push(`${path}.rootComponentIds[${index}] must be a non-empty string`);
      } else if (!componentIds.has(id)) {
        errors.push(`${path}.rootComponentIds[${index}] references an unknown component`);
      } else if (rootIds.has(id)) {
        errors.push(`${path}.rootComponentIds[${index}] duplicates "${id}"`);
      } else {
        rootIds.add(id);
      }
    });
  }

  return true;
}

function validateUniqueIds(values: readonly unknown[], path: string, errors: string[]): void {
  const ids = new Set<string>();

  values.forEach((value, index) => {
    const id = isRecord(value) ? value.id : undefined;
    if (!isString(id)) {
      return;
    }
    if (ids.has(id)) {
      errors.push(`${path}[${index}].id duplicates "${id}"`);
    }
    ids.add(id);
  });
}

export function validateProjectManifest(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ["project must be an object"] };
  }

  if (input.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PROJECT_SCHEMA_VERSION}`);
  }
  if (!isString(input.id)) errors.push("id must be a non-empty string");
  if (!isString(input.name)) errors.push("name must be a non-empty string");

  const assets = Array.isArray(input.assets) ? input.assets : [];
  const components = Array.isArray(input.components) ? input.components : [];
  const scenes = Array.isArray(input.scenes) ? input.scenes : [];

  if (!Array.isArray(input.assets)) errors.push("assets must be an array");
  if (!Array.isArray(input.components)) errors.push("components must be an array");
  if (!Array.isArray(input.scenes)) errors.push("scenes must be an array");

  validateUniqueIds(assets, "assets", errors);
  validateUniqueIds(components, "components", errors);
  validateUniqueIds(scenes, "scenes", errors);

  const assetIds = new Set<string>();
  assets.forEach((asset, index) => {
    const path = `assets[${index}]`;
    if (!isRecord(asset)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!isString(asset.id)) errors.push(`${path}.id must be a non-empty string`);
    if (!isString(asset.name)) errors.push(`${path}.name must be a non-empty string`);
    if (!ASSET_TYPES.includes(asset.type as AssetType)) errors.push(`${path}.type is unsupported`);
    if (!isString(asset.source)) errors.push(`${path}.source must be a non-empty string`);
    if (isString(asset.id)) assetIds.add(asset.id);
  });

  const componentIds = new Set<string>();
  components.forEach((component) => {
    if (isRecord(component) && isString(component.id)) componentIds.add(component.id);
  });
  components.forEach((component, index) => {
    validateComponent(component, `components[${index}]`, errors, assetIds);
  });
  scenes.forEach((scene, index) => validateScene(scene, `scenes[${index}]`, componentIds, errors));

  return { valid: errors.length === 0, errors };
}

export function isProjectManifest(input: unknown): input is ProjectManifest {
  return validateProjectManifest(input).valid;
}

export function parseProjectManifest(input: unknown): ProjectManifest {
  const result = validateProjectManifest(input);
  if (!result.valid) {
    throw new TypeError(`Invalid project manifest:\n${result.errors.join("\n")}`);
  }
  return input as ProjectManifest;
}
