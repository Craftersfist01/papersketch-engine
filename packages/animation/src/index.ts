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
