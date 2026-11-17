import { describe, expect, it } from "vitest";
import { generateBrushMarks, getBrushProfile, type Stroke } from "./index.js";

const stroke: Stroke = {
  id: "stroke-1",
  seed: 12345,
  brush: {
    kind: "pencil",
    size: 4,
    opacity: 0.8,
    density: 3
  },
  points: [
    { x: 10, y: 20, pressure: 0.5, tiltX: 0, tiltY: 0, timeMs: 0 },
    { x: 14, y: 24, pressure: 0.8, tiltX: 2, tiltY: -1, timeMs: 16 }
  ]
};

describe("brush generation", () => {
  it("generates reproducible marks from a stored seed", () => {
    expect(generateBrushMarks(stroke)).toEqual(generateBrushMarks(stroke));
    expect(generateBrushMarks({ ...stroke, seed: 12346 })).not.toEqual(generateBrushMarks(stroke));
  });

  it("honors brush density and keeps mark values bounded", () => {
    const marks = generateBrushMarks(stroke);

    expect(marks).toHaveLength(6);
    expect(marks.every((mark) => mark.size > 0 && mark.alpha >= 0 && mark.alpha <= 1)).toBe(true);
  });

  it("rejects invalid brush parameters instead of producing unbounded work", () => {
    expect(() => generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, density: Number.POSITIVE_INFINITY }
    })).toThrow("Brush density must be greater than zero");
    expect(() => generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, size: 0 }
    })).toThrow("Brush size must be greater than zero");
    expect(() => generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, density: 257 }
    })).toThrow("Brush density must not exceed 256");
  });

  it("applies profile defaults and pressure, tilt, and velocity inputs", () => {
    const marks = generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, kind: "charcoal" },
      points: [
        ...stroke.points,
        { x: 80, y: 80, pressure: 1, tiltX: 45, tiltY: 45, timeMs: 20 }
      ]
    });

    expect(getBrushProfile("charcoal").grain).toBeGreaterThan(getBrushProfile("pencil").grain);
    expect(marks.every((mark) => Number.isFinite(mark.rotation))).toBe(true);
    expect(marks.every((mark) => mark.hardness >= 0 && mark.hardness <= 1)).toBe(true);
  });

  it("emits opaque erase marks for the eraser profile", () => {
    const marks = generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, kind: "eraser", opacity: 0 }
    });

    expect(marks.every((mark) => mark.erase && mark.alpha === 1)).toBe(true);
  });

  it("rejects invalid profile values and backwards timestamps", () => {
    expect(() => generateBrushMarks({
      ...stroke,
      brush: { ...stroke.brush, profile: { grain: 2 } }
    })).toThrow("Brush profile grain must be between 0 and 1");
    expect(() => generateBrushMarks({
      ...stroke,
      points: [
        stroke.points[0],
        { ...stroke.points[1], timeMs: -1 }
      ]
    })).toThrow("Stroke point 1 timestamp must not move backwards");
  });
});
