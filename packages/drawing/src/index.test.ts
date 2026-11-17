import { describe, expect, it } from "vitest";
import { generateBrushMarks, type Stroke } from "./index.js";

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
  });
});
