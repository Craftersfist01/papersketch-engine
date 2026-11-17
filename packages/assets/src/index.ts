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
  clear(): void;
}

export function createAssetStore(source: AssetSource): AssetStore {
  const loaded = new Map<string, LoadedAsset>();
  const pending = new Map<string, Promise<LoadedAsset>>();

  const load = (asset: AssetDefinition): Promise<LoadedAsset> => {
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
    clear: () => loaded.clear()
  };
}
