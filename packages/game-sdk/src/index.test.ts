import { describe, expect, it, vi } from "vitest";
import { GameEventBus, GameState, ProjectCommandBus } from "./index.js";

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

  it("dispatches project commands and supports unsubscribe", () => {
    const bus = new ProjectCommandBus();
    const listener = vi.fn();
    const unsubscribe = bus.on(listener);
    bus.dispatch({ type: "set-layer", payload: { visible: false } });
    unsubscribe();
    bus.dispatch({ type: "ignored" });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      type: "set-layer",
      payload: { visible: false }
    });
    expect(() => bus.dispatch({ type: " " })).toThrow("non-empty string");
  });
});
