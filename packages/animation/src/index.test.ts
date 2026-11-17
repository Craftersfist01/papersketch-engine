import { describe, expect, it } from "vitest";
import {
  AnimationScheduler,
  LayerStateAnimator,
  applyEasing,
  interpolateLayerState
} from "./index.js";

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

  it("interpolates layer states with easing and completion", () => {
    const from = { opacity: 0, rotation: 0, scale: 1, x: 0, y: 0, visible: false };
    const to = { opacity: 1, rotation: 90, scale: 2, x: 20, y: 10, visible: true };
    expect(applyEasing(0.5, "ease-in-out")).toBe(0.5);
    expect(interpolateLayerState(from, to, 0.5, "linear")).toEqual({
    opacity: 0.5,
    rotation: 45,
    scale: 1.5,
    x: 10,
    y: 5,
    visible: false
    });

    const animator = new LayerStateAnimator();
    animator.add({ id: "fade-in", from, to, durationMs: 100, easing: "ease-out" });
    expect(animator.tick(50)[0]?.completed).toBe(false);
    expect(animator.tick(50)[0]).toMatchObject({
    id: "fade-in",
    progress: 1,
    completed: true,
    state: to
    });
  });

  it("rejects invalid layer state and transition timing", () => {
    const animator = new LayerStateAnimator();
    expect(() => animator.add({
    id: "bad",
    from: { opacity: 0, rotation: 0, scale: -1, x: 0, y: 0, visible: true },
    to: { opacity: 1, rotation: 0, scale: 1, x: 0, y: 0, visible: true },
    durationMs: 100
    })).toThrow("scale must not be negative");
    expect(() => animator.tick(-1)).toThrow("non-negative finite number");
  });
});
