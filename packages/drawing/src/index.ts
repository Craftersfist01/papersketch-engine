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
  readonly color?: string;
  readonly profile?: Partial<BrushProfile>;
}

export interface BrushProfile {
  readonly pressureSize: number;
  readonly pressureOpacity: number;
  readonly tiltInfluence: number;
  readonly velocityInfluence: number;
  readonly grain: number;
  readonly spacing: number;
  readonly hardness: number;
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
  readonly rotation: number;
  readonly hardness: number;
  readonly erase: boolean;
}

const DEFAULT_PROFILE: BrushProfile = {
  pressureSize: 0.65,
  pressureOpacity: 0.25,
  tiltInfluence: 0.15,
  velocityInfluence: 0.08,
  grain: 0.18,
  spacing: 0.35,
  hardness: 0.8
};

const BRUSH_PROFILES: Record<BrushKind, BrushProfile> = {
  pencil: DEFAULT_PROFILE,
  "soft-pencil": {
    pressureSize: 0.8,
    pressureOpacity: 0.45,
    tiltInfluence: 0.25,
    velocityInfluence: 0.12,
    grain: 0.3,
    spacing: 0.28,
    hardness: 0.35
  },
  "hard-pencil": {
    pressureSize: 0.5,
    pressureOpacity: 0.2,
    tiltInfluence: 0.1,
    velocityInfluence: 0.05,
    grain: 0.1,
    spacing: 0.45,
    hardness: 0.95
  },
  charcoal: {
    pressureSize: 0.95,
    pressureOpacity: 0.55,
    tiltInfluence: 0.5,
    velocityInfluence: 0.18,
    grain: 0.65,
    spacing: 0.22,
    hardness: 0.18
  },
  fineliner: {
    pressureSize: 0.18,
    pressureOpacity: 0.08,
    tiltInfluence: 0.04,
    velocityInfluence: 0.02,
    grain: 0.03,
    spacing: 0.7,
    hardness: 1
  },
  eraser: {
    pressureSize: 0.4,
    pressureOpacity: 0,
    tiltInfluence: 0.2,
    velocityInfluence: 0.05,
    grain: 0.08,
    spacing: 0.35,
    hardness: 1
  }
};

export function getBrushProfile(
  kind: BrushKind,
  overrides: Partial<BrushProfile> = {}
): BrushProfile {
  const profile = { ...BRUSH_PROFILES[kind], ...overrides };
  for (const [name, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`Brush profile ${name} must be between 0 and 1`);
    }
  }
  return profile;
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
  if (stroke.brush.density > 256) {
    throw new RangeError("Brush density must not exceed 256");
  }
  getBrushProfile(stroke.brush.kind, stroke.brush.profile);

  stroke.points.forEach((point, index) => {
    for (const value of [point.x, point.y, point.pressure, point.tiltX, point.tiltY, point.timeMs]) {
      if (!Number.isFinite(value)) {
        throw new RangeError(`Stroke point ${index} contains a non-finite value`);
      }
    }
    if (point.pressure < 0 || point.pressure > 1) {
      throw new RangeError(`Stroke point ${index} pressure must be between 0 and 1`);
    }
    if (point.tiltX < -90 || point.tiltX > 90 || point.tiltY < -90 || point.tiltY > 90) {
      throw new RangeError(`Stroke point ${index} tilt must be between -90 and 90 degrees`);
    }
    if (index > 0 && point.timeMs < stroke.points[index - 1].timeMs) {
      throw new RangeError(`Stroke point ${index} timestamp must not move backwards`);
    }
  });
}

export function generateBrushMarks(stroke: Stroke): readonly BrushMark[] {
  validateStroke(stroke);
  const random = createSeededRandom(stroke.seed);
  const profile = getBrushProfile(stroke.brush.kind, stroke.brush.profile);
  const marks: BrushMark[] = [];

  for (const [pointIndex, point] of stroke.points.entries()) {
    const density = Math.max(1, Math.round(stroke.brush.density));
    const previous = stroke.points[pointIndex - 1];
    const deltaTime = previous ? Math.max(1, point.timeMs - previous.timeMs) : 16;
    const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
    const velocity = Math.min(1, distance / deltaTime / 2);
    const pressure = Math.max(0, Math.min(1, point.pressure));
    const pressureSize = 0.55 + pressure * (0.9 * profile.pressureSize);
    const pressureOpacity = 0.55 + pressure * (0.45 * profile.pressureOpacity);
    const tilt = Math.min(1, Math.hypot(point.tiltX, point.tiltY) / 90);
    const velocitySize = Math.max(0.35, 1 - velocity * profile.velocityInfluence);
    const tiltSize = 1 + tilt * profile.tiltInfluence;

    for (let index = 0; index < density; index += 1) {
      const grain = (random() - 0.5) * profile.grain;
      const jitter = stroke.brush.size * (profile.spacing + profile.grain * 0.35);
      marks.push({
        x: point.x + (random() - 0.5) * jitter * (1 + grain),
        y: point.y + (random() - 0.5) * jitter * (1 + grain),
        size: Math.max(
          0.1,
          stroke.brush.size
            * (0.82 + random() * 0.36)
            * pressureSize
            * velocitySize
            * tiltSize
        ),
        alpha: stroke.brush.kind === "eraser"
          ? 1
          : Math.max(
              0,
              Math.min(
                1,
                stroke.brush.opacity
                  * (0.75 + random() * 0.25)
                  * pressureOpacity
                  * (1 - grain * 0.35)
              )
            ),
        rotation: Math.atan2(point.tiltY, point.tiltX),
        hardness: profile.hardness,
        erase: stroke.brush.kind === "eraser"
      });
    }
  }

  return marks;
}
