export type GameEventMap = Record<string, unknown>;

export class GameEventBus<Events extends GameEventMap> {
  private readonly listeners = new Map<keyof Events, Set<(payload: unknown) => void>>();

  public on<Key extends keyof Events>(event: Key, listener: (payload: Events[Key]) => void): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (payload: unknown) => void);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as (payload: unknown) => void);
  }

  public emit<Key extends keyof Events>(event: Key, payload: Events[Key]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

export class GameState<T> {
  public constructor(private value: T) {}

  public get(): T {
    return this.value;
  }

  public set(value: T): void {
    this.value = value;
  }

  public update(update: (current: T) => T): void {
    this.value = update(this.value);
  }
}
