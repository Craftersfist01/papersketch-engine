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
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function generateBrushMarks(stroke: Stroke): readonly BrushMark[] {
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
