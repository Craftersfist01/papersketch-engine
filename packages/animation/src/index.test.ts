import { describe, expect, it } from "vitest";
import { AnimationScheduler } from "./index.js";

describe("AnimationScheduler", () => {
  it("advances finite animations and clamps completed progress", () => {
    const scheduler = new AnimationScheduler();
    scheduler.add({ id: "press", durationMs: 100, loop: false });

    expect(scheduler.tick(40)).toEqual([{
      id: "press",
      progress: 0.4,
      elapsedMs: 40,
      completed: false
    }]);
    expect(scheduler.tick(100)).toEqual([{
      id: "press",
      progress: 1,
      elapsedMs: 100,
      completed: true
    }]);
  });

  it("wraps loops and rejects invalid durations", () => {
    const scheduler = new AnimationScheduler();
    scheduler.add({ id: "idle", durationMs: 100, loop: true });

    expect(scheduler.tick(125)[0]?.progress).toBe(0.25);
    expect(() => scheduler.add({ id: "bad", durationMs: 0, loop: false }))
      .toThrow("positive finite duration");
    expect(() => scheduler.tick(-1)).toThrow("non-negative finite number");
  });
});
