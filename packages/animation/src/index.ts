export interface AnimationDefinition {
  readonly id: string;
  readonly durationMs: number;
  readonly loop: boolean;
}

export interface AnimationFrame {
  readonly id: string;
  readonly progress: number;
  readonly elapsedMs: number;
  readonly completed: boolean;
}

export type EasingName = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface LayerState {
  readonly opacity: number;
  readonly rotation: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

export interface LayerTransition {
  readonly id: string;
  readonly from: LayerState;
  readonly to: LayerState;
  readonly durationMs: number;
  readonly easing?: EasingName;
}

export interface LayerStateFrame {
  readonly id: string;
  readonly state: LayerState;
  readonly progress: number;
  readonly completed: boolean;
}

function validateLayerState(state: LayerState): void {
  for (const value of [state.opacity, state.rotation, state.scale, state.x, state.y]) {
    if (!Number.isFinite(value)) {
      throw new RangeError("Layer state values must be finite");
    }
  }
  if (state.opacity < 0 || state.opacity > 1 || state.scale < 0) {
    throw new RangeError("Layer opacity must be between 0 and 1 and scale must not be negative");
  }
}

export function applyEasing(progress: number, easing: EasingName = "linear"): number {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError("Easing progress must be between 0 and 1");
  }
  if (easing === "ease-in") {
    return progress * progress;
  }
  if (easing === "ease-out") {
    return 1 - (1 - progress) ** 2;
  }
  if (easing === "ease-in-out") {
    return progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;
  }
  return progress;
}

export function interpolateLayerState(
  from: LayerState,
  to: LayerState,
  progress: number,
  easing: EasingName = "linear"
): LayerState {
  validateLayerState(from);
  validateLayerState(to);
  const eased = applyEasing(progress, easing);
  return {
    opacity: from.opacity + (to.opacity - from.opacity) * eased,
    rotation: from.rotation + (to.rotation - from.rotation) * eased,
    scale: from.scale + (to.scale - from.scale) * eased,
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    visible: eased < 1 ? from.visible : to.visible
  };
}

export class LayerStateAnimator {
  private readonly transitions = new Map<string, LayerTransition>();
  private readonly elapsed = new Map<string, number>();

  public add(transition: LayerTransition): void {
    if (!transition.id || !Number.isFinite(transition.durationMs) || transition.durationMs <= 0) {
      throw new RangeError("Layer transition id and positive finite duration are required");
    }
    validateLayerState(transition.from);
    validateLayerState(transition.to);
    if (transition.easing && !["linear", "ease-in", "ease-out", "ease-in-out"].includes(transition.easing)) {
      throw new RangeError(`Unsupported easing "${transition.easing}"`);
    }
    this.transitions.set(transition.id, transition);
    this.elapsed.set(transition.id, 0);
  }

  public remove(id: string): void {
    this.transitions.delete(id);
    this.elapsed.delete(id);
  }

  public tick(deltaMs: number): readonly LayerStateFrame[] {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Layer transition delta must be a non-negative finite number");
    }
    return [...this.transitions.values()].map((transition) => {
      const elapsedMs = Math.min(
        transition.durationMs,
        (this.elapsed.get(transition.id) ?? 0) + deltaMs
      );
      const progress = elapsedMs / transition.durationMs;
      this.elapsed.set(transition.id, elapsedMs);
      return {
        id: transition.id,
        state: interpolateLayerState(
          transition.from,
          transition.to,
          progress,
          transition.easing
        ),
        progress,
        completed: progress >= 1
      };
    });
  }
}

export class AnimationScheduler {
  private readonly definitions = new Map<string, AnimationDefinition>();
  private readonly elapsed = new Map<string, number>();

  public add(definition: AnimationDefinition): void {
    if (!definition.id || !Number.isFinite(definition.durationMs) || definition.durationMs <= 0) {
      throw new RangeError("Animation id and positive finite duration are required");
    }

    this.definitions.set(definition.id, definition);
    this.elapsed.set(definition.id, 0);
  }

  public remove(id: string): void {
    this.definitions.delete(id);
    this.elapsed.delete(id);
  }

  public reset(id?: string): void {
    if (id !== undefined && !this.definitions.has(id)) {
      throw new RangeError(`Unknown animation "${id}"`);
    }

    if (id !== undefined) {
      this.elapsed.set(id, 0);
      return;
    }

    for (const animationId of this.definitions.keys()) {
      this.elapsed.set(animationId, 0);
    }
  }

  public tick(deltaMs: number): readonly AnimationFrame[] {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new RangeError("Animation delta must be a non-negative finite number");
    }

    return [...this.definitions.values()].map((definition) => {
      const current = (this.elapsed.get(definition.id) ?? 0) + deltaMs;
      const elapsedMs = definition.loop
        ? current % definition.durationMs
        : Math.min(current, definition.durationMs);
      const completed = !definition.loop && current >= definition.durationMs;
      this.elapsed.set(definition.id, elapsedMs);

      return {
        id: definition.id,
        progress: elapsedMs / definition.durationMs,
        elapsedMs,
        completed
      };
    });
  }
}
