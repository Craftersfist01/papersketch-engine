import { describe, expect, it, vi } from "vitest";
import { createAssetFingerprint, createAssetStore } from "./index.js";

describe("createAssetStore", () => {
  it("caches loaded assets and coalesces concurrent requests", async () => {
    const fetch = vi.fn(async () => "asset-data");
    const store = createAssetStore({ fetch });
    const asset = {
      id: "icon",
      name: "Icon",
      type: "svg" as const,
      source: "icon.svg"
    };

    const [first, second] = await Promise.all([store.load(asset), store.load(asset)]);

    expect(first).toBe(second);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.get("icon")).toBe(first);
  });

  it("clears cached assets without hiding source failures", async () => {
    const error = new Error("load failed");
    const store = createAssetStore({
      fetch: vi.fn(async () => {
        throw error;
      })
    });
    const asset = {
      id: "missing",
      name: "Missing",
      type: "png" as const,
      source: "missing.png"
    };

    await expect(store.load(asset)).rejects.toBe(error);
    store.clear();
    expect(store.get("missing")).toBeUndefined();
  });

  it("fingerprints bytes and supports targeted invalidation", async () => {
    const store = createAssetStore({ fetch: vi.fn(async () => "asset-data") });
    const asset = {
      id: "icon",
      name: "Icon",
      type: "svg" as const,
      source: "icon.svg"
    };
    await store.load(asset);

    expect(createAssetFingerprint(new Uint8Array([1, 2, 3]))).toBe("56cf37ab");
    expect(store.has?.("icon")).toBe(true);
    store.invalidate?.("icon");
    expect(store.has?.("icon")).toBe(false);
    expect(store.snapshot?.()).toEqual([]);
  });

  it("rejects unsafe asset definitions before fetching", async () => {
    const fetch = vi.fn(async () => "asset-data");
    const store = createAssetStore({ fetch });

    expect(() => store.load({
      id: "../escape",
      name: "Escape",
      type: "png",
      source: "escape.png"
    })).toThrow("Unsafe asset id");
    expect(fetch).not.toHaveBeenCalled();
  });
});
