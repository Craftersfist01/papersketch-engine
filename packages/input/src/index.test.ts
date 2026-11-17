import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUT_POLICY,
  normalizePointerSample,
  PointerSessionManager,
  resolvePointerAction
} from "./index.js";

describe("pointer input", () => {
  it("normalizes pen data and applies the default drawing policy", () => {
    const sample = normalizePointerSample({
      pointerId: 7,
      pointerType: "pen",
      clientX: 12,
      clientY: 24,
      pressure: 0.75,
      tiltX: 10,
      tiltY: -5,
      buttons: 1,
      timeStamp: 42
    });

    expect(sample).toEqual({
      pointerId: 7,
      device: "pen",
      x: 12,
      y: 24,
      pressure: 0.75,
      tiltX: 10,
      tiltY: -5,
      buttons: 1,
      timeMs: 42
    });
    expect(resolvePointerAction(sample)).toBe("draw");
  });

  it("maps touch and mouse independently and rejects invalid pressure", () => {
    const touch = normalizePointerSample({
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0
    });
    const mouse = normalizePointerSample({
      pointerId: 2,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0
    });

    expect(resolvePointerAction(touch)).toBe(DEFAULT_INPUT_POLICY.touch);
    expect(resolvePointerAction(mouse)).toBe(DEFAULT_INPUT_POLICY.mouse);
    expect(() => normalizePointerSample({
      pointerId: 3,
      pointerType: "pen",
      clientX: 0,
      clientY: 0,
      pressure: 2
    })).toThrow("Pointer pressure must be between 0 and 1");
    expect(() => normalizePointerSample({
      pointerId: 4,
      pointerType: "pen",
      clientX: Number.NaN,
      clientY: 0
    })).toThrow("Pointer coordinates must be finite numbers");
  });

  it("tracks independent pointer sessions through completion", () => {
    const manager = new PointerSessionManager();
    const start = normalizePointerSample({
      pointerId: 7,
      pointerType: "pen",
      clientX: 10,
      clientY: 20,
      timeStamp: 0
    });
    const move = normalizePointerSample({
      pointerId: 7,
      pointerType: "pen",
      clientX: 12,
      clientY: 22,
      timeStamp: 10
    });
    const end = normalizePointerSample({
      pointerId: 7,
      pointerType: "pen",
      clientX: 14,
      clientY: 24,
      timeStamp: 20
    });

    expect(manager.begin(start).action).toBe("draw");
    expect(manager.update(move).samples).toHaveLength(2);
    expect(manager.end(end).phase).toBe("end");
    expect(manager.get(7)).toBeUndefined();
  });

  it("supports cancellation and rejects duplicate or out-of-order samples", () => {
    const manager = new PointerSessionManager();
    const sample = normalizePointerSample({
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
      timeStamp: 10
    });
    manager.begin(sample);
    expect(() => manager.begin(sample)).toThrow("already has an active session");
    expect(() => manager.update({ ...sample, timeMs: 5 })).toThrow("must not move backwards");
    expect(manager.cancelAll()[0]?.phase).toBe("cancel");
    expect(manager.active()).toHaveLength(0);
  });
});
