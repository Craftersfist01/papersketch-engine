import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { createAssetFingerprint } from "@papersketch/assets";
import {
  parseProjectManifest,
  type AssetDefinition,
  type ComponentDefinition
} from "@papersketch/project-schema";

const BUNDLE_FORMAT = "papersketch-component";
const BUNDLE_VERSION = 1 as const;
const MAX_BUNDLE_BYTES = 10 * 1024 * 1024;

function assertSafeAssetId(assetId: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(assetId)) {
    throw new TypeError(`Unsafe component asset id "${assetId}"`);
  }
}

function assertAssetHash(asset: AssetDefinition, data: Uint8Array): void {
  if (asset.hash && asset.hash !== createAssetFingerprint(data)) {
    throw new TypeError(`Asset "${asset.id}" fingerprint does not match its manifest hash`);
  }
}

export interface ComponentBundle {
  readonly format: typeof BUNDLE_FORMAT;
  readonly version: typeof BUNDLE_VERSION;
  readonly component: ComponentDefinition;
  readonly assets: readonly AssetDefinition[];
  readonly assetData: Readonly<Record<string, Uint8Array>>;
}

export interface ComponentLibraryEntry {
  readonly component: ComponentDefinition;
  readonly assets: readonly AssetDefinition[];
}

function validateBundle(bundle: unknown): asserts bundle is Omit<ComponentBundle, "assetData"> {
  if (typeof bundle !== "object" || bundle === null || Array.isArray(bundle)) {
    throw new TypeError("Component bundle must be an object");
  }
  const value = bundle as Record<string, unknown>;
  if (value.format !== BUNDLE_FORMAT || value.version !== BUNDLE_VERSION) {
    throw new TypeError("Unsupported component bundle format or version");
  }
  if (!Array.isArray(value.assets)) {
    throw new TypeError("Component bundle assets must be an array");
  }
  value.assets.forEach((asset) => {
    if (typeof asset === "object" && asset !== null && "id" in asset && typeof asset.id === "string") {
      assertSafeAssetId(asset.id);
    }
  });

  parseProjectManifest({
    schemaVersion: 2,
    id: "component-bundle",
    name: "Component bundle",
    scenes: [],
    components: [value.component],
    assets: value.assets
  });
}

export class ComponentLibrary {
  private readonly entries = new Map<string, ComponentLibraryEntry>();

  public add(entry: ComponentLibraryEntry): void {
    entry.assets.forEach((asset) => assertSafeAssetId(asset.id));
    parseProjectManifest({
      schemaVersion: 2,
      id: "component-library",
      name: "Component library",
      scenes: [],
      components: [entry.component],
      assets: entry.assets
    });
    this.entries.set(entry.component.id, entry);
  }

  public remove(componentId: string): boolean {
    return this.entries.delete(componentId);
  }

  public get(componentId: string): ComponentLibraryEntry | undefined {
    return this.entries.get(componentId);
  }

  public list(): readonly ComponentLibraryEntry[] {
    return [...this.entries.values()];
  }

  public exportZip(componentId: string, assetData: Readonly<Record<string, Uint8Array>> = {}): Uint8Array {
    const entry = this.entries.get(componentId);
    if (!entry) {
      throw new RangeError(`Unknown library component "${componentId}"`);
    }

    const manifest = {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      component: entry.component,
      assets: entry.assets
    };
    const files: Record<string, Uint8Array> = {
      "manifest.json": strToU8(JSON.stringify(manifest))
    };
    for (const asset of entry.assets) {
      assertSafeAssetId(asset.id);
      const data = assetData[asset.id];
      if (data) {
        assertAssetHash(asset, data);
        files[`assets/${asset.id}`] = data;
      }
    }
    const result = zipSync(files);
    if (result.byteLength > MAX_BUNDLE_BYTES) {
      throw new RangeError("Component bundle exceeds the 10 MiB size limit");
    }
    return result;
  }

  public importZip(data: Uint8Array): ComponentBundle {
    if (data.byteLength > MAX_BUNDLE_BYTES) {
      throw new RangeError("Component bundle exceeds the 10 MiB size limit");
    }
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(data);
    } catch (error) {
      throw new TypeError(`Component bundle ZIP is invalid: ${String(error)}`);
    }
    const uncompressedBytes = Object.values(files)
      .reduce((total, file) => total + file.byteLength, 0);
    if (uncompressedBytes > MAX_BUNDLE_BYTES) {
      throw new RangeError("Component bundle contents exceed the 10 MiB size limit");
    }
    for (const path of Object.keys(files)) {
      if (path !== "manifest.json" && !path.startsWith("assets/")) {
        throw new TypeError(`Component bundle contains an unsupported file "${path}"`);
      }
      if (path.startsWith("assets/")) {
        assertSafeAssetId(path.slice("assets/".length));
      }
    }
    const manifestFile = files["manifest.json"];
    if (!manifestFile) {
      throw new TypeError("Component bundle is missing manifest.json");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(strFromU8(manifestFile));
    } catch (error) {
      throw new TypeError(`Component bundle manifest is invalid: ${String(error)}`);
    }
    validateBundle(parsed);

    const assetData: Record<string, Uint8Array> = {};
    for (const asset of parsed.assets) {
      const file = files[`assets/${asset.id}`];
      if (file) {
        assertAssetHash(asset, file);
        assetData[asset.id] = file;
      }
    }

    return { ...parsed, assetData };
  }
}
