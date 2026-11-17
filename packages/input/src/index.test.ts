import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUT_POLICY,
  normalizePointerSample,
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
  });
});
