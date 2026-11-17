export type BrushKind =
  | "pencil"
  | "soft-pencil"
  | "hard-pencil"
  | "charcoal"
  | "fineliner"
  | "eraser";

export interface BrushDefinition {
  readonly kind: BrushKind;
  readonly size: number;
  readonly opacity: number;
  readonly density: number;
}

export interface StrokePoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly timeMs: number;
}

export interface Stroke {
  readonly id: string;
  readonly seed: number;
  readonly brush: BrushDefinition;
  readonly points: readonly StrokePoint[];
}

export interface BrushMark {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
}

export function createSeededRandom(seed: number): () => number {
  if (!Number.isFinite(seed)) {
    throw new RangeError("Brush seed must be a finite number");
  }
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function validateStroke(stroke: Stroke): void {
  if (!Number.isFinite(stroke.seed)) {
    throw new RangeError("Brush seed must be a finite number");
  }
  if (!Number.isFinite(stroke.brush.size) || stroke.brush.size <= 0) {
    throw new RangeError("Brush size must be greater than zero");
  }
  if (!Number.isFinite(stroke.brush.opacity) || stroke.brush.opacity < 0 || stroke.brush.opacity > 1) {
    throw new RangeError("Brush opacity must be between 0 and 1");
  }
  if (!Number.isFinite(stroke.brush.density) || stroke.brush.density <= 0) {
    throw new RangeError("Brush density must be greater than zero");
  }

  stroke.points.forEach((point, index) => {
    for (const value of [point.x, point.y, point.pressure, point.tiltX, point.tiltY, point.timeMs]) {
      if (!Number.isFinite(value)) {
        throw new RangeError(`Stroke point ${index} contains a non-finite value`);
      }
    }
    if (point.pressure < 0 || point.pressure > 1) {
      throw new RangeError(`Stroke point ${index} pressure must be between 0 and 1`);
    }
  });
}

export function generateBrushMarks(stroke: Stroke): readonly BrushMark[] {
  validateStroke(stroke);
  const random = createSeededRandom(stroke.seed);
  const marks: BrushMark[] = [];

  for (const point of stroke.points) {
    const density = Math.max(1, Math.round(stroke.brush.density));
    for (let index = 0; index < density; index += 1) {
      const jitter = stroke.brush.size * 0.35;
      const pressure = Math.max(0, Math.min(1, point.pressure));
      marks.push({
        x: point.x + (random() - 0.5) * jitter,
        y: point.y + (random() - 0.5) * jitter,
        size: Math.max(0.1, stroke.brush.size * (0.65 + random() * 0.7) * (0.5 + pressure)),
        alpha: Math.max(0, Math.min(1, stroke.brush.opacity * (0.45 + random() * 0.55)))
      });
    }
  }

  return marks;
}
