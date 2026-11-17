import { describe, expect, it, vi } from "vitest";
import { GameEventBus, GameState } from "./index.js";

describe("game SDK primitives", () => {
  it("emits typed game events and supports unsubscribe", () => {
    const bus = new GameEventBus<{ score: number }>();
    const listener = vi.fn();
    const unsubscribe = bus.on("score", listener);

    bus.emit("score", 10);
    unsubscribe();
    bus.emit("score", 20);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(10);
  });

  it("updates game state through a controlled callback", () => {
    const state = new GameState({ score: 1 });
    state.update((current) => ({ score: current.score + 1 }));

    expect(state.get()).toEqual({ score: 2 });
  });
});
