import { describe, expect, it, vi } from "vitest";
import type { Stroke } from "@papersketch/drawing";
import { createLoopbackTransportPair, JsonChannel } from "@papersketch/networking";
import { IpadBridgeHost, IpadPreviewClient } from "./index.js";

const stroke: Stroke = {
  id: "stroke-1",
  seed: 1,
  brush: { kind: "pencil", size: 4, opacity: 1, density: 2 },
  points: [{ x: 10, y: 20, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 0 }]
};

describe("iPad bridge", () => {
  it("mirrors full-screen preview, own strokes and PC-controlled style", () => {
    const [hostTransport, clientTransport] = createLoopbackTransportPair();
    const host = new IpadBridgeHost(new JsonChannel(hostTransport));
    const client = new IpadPreviewClient(new JsonChannel(clientTransport));

    host.publishPreview({
      layout: "full-screen-preview",
      canvasWidth: 1920,
      canvasHeight: 1080,
      color: "#222222",
      brushSize: 4,
      tool: "pencil",
      strokes: [stroke],
      activeStroke: stroke
    });

    expect(client.getPreview()).toMatchObject({
      layout: "full-screen-preview",
      color: "#222222",
      brushSize: 4,
      strokes: [stroke],
      activeStroke: stroke
    });
  });

  it("relays normalized iPad pointer data and rejects invalid coordinates", () => {
    const [hostTransport, clientTransport] = createLoopbackTransportPair();
    const host = new IpadBridgeHost(new JsonChannel(hostTransport));
    const client = new IpadPreviewClient(new JsonChannel(clientTransport));
    const received = vi.fn();
    host.onPointer(received);

    client.sendPointer({
      phase: "move",
      pointerId: 1,
      x: 0.5,
      y: 0.25,
      pressure: 0.8,
      tiltX: 0,
      tiltY: 0
    });

    expect(received).toHaveBeenCalledWith(expect.objectContaining({ x: 0.5, y: 0.25 }));
    expect(() => client.sendPointer({
      phase: "move",
      pointerId: 1,
      x: 2,
      y: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0
    })).toThrow("normalized between 0 and 1");
  });
});
