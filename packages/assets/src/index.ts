import type { AssetDefinition } from "@papersketch/project-schema";

export interface AssetSource {
  fetch(asset: AssetDefinition): Promise<unknown>;
}

export interface LoadedAsset {
  readonly definition: AssetDefinition;
  readonly data: unknown;
}

export interface AssetStore {
  load(asset: AssetDefinition): Promise<LoadedAsset>;
  get(assetId: string): LoadedAsset | undefined;
  preload(assets: readonly AssetDefinition[]): Promise<readonly LoadedAsset[]>;
  has?(assetId: string): boolean;
  invalidate?(assetId?: string): void;
  snapshot?(): readonly LoadedAsset[];
  clear(): void;
}

export function createAssetFingerprint(data: Uint8Array): string {
  let hash = 2166136261;
  for (const byte of data) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function assertAssetDefinition(asset: AssetDefinition): void {
  if (!/^[A-Za-z0-9._-]+$/.test(asset.id)) {
    throw new TypeError(`Unsafe asset id "${asset.id}"`);
  }
  if (!asset.source.trim()) {
    throw new TypeError(`Asset "${asset.id}" must define a source`);
  }
}

export function createAssetStore(source: AssetSource): AssetStore {
  const loaded = new Map<string, LoadedAsset>();
  const pending = new Map<string, Promise<LoadedAsset>>();

  const load = (asset: AssetDefinition): Promise<LoadedAsset> => {
    assertAssetDefinition(asset);
    const cached = loaded.get(asset.id);
    if (cached) {
      return Promise.resolve(cached);
    }

    const existing = pending.get(asset.id);
    if (existing) {
      return existing;
    }

    const request = source.fetch(asset).then((data) => {
      const result = { definition: asset, data };
      loaded.set(asset.id, result);
      pending.delete(asset.id);
      return result;
    }, (error: unknown) => {
      pending.delete(asset.id);
      throw error;
    });

    pending.set(asset.id, request);
    return request;
  };

  return {
    load,
    get: (assetId) => loaded.get(assetId),
    preload: (assets) => Promise.all(assets.map(load)),
    has: (assetId) => loaded.has(assetId),
    invalidate: (assetId) => {
      if (assetId === undefined) {
        loaded.clear();
        return;
      }
      loaded.delete(assetId);
    },
    snapshot: () => [...loaded.values()],
    clear: () => loaded.clear()
  };
}
