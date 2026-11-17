import { describe, expect, it } from "vitest";
import { createConnectionDescriptor } from "@papersketch/websocket-transport";
import {
  IpadConnectionFlow,
  createHostConnectionPanel,
  renderPreviewState,
  setHostConnectionStatus
} from "./index.js";

const descriptor = createConnectionDescriptor("ws://192.168.0.10:4173", "secret-token");

describe("connection UI models", () => {
  it("creates a host model with a connection URL and QR payload", () => {
    const model = createHostConnectionPanel(descriptor);

    expect(model).toMatchObject({
      role: "host",
      status: "waiting",
      connectionUrl: "ws://192.168.0.10:4173/?token=secret-token"
    });
    expect(model.qrPayload).toContain("papersketch://connect");
    expect(setHostConnectionStatus(model, "connected").status).toBe("connected");
  });

  it("connects the iPad flow using the scanned payload", async () => {
    const flow = new IpadConnectionFlow();
    let url = "";

    await flow.connect(createHostConnectionPanel(descriptor).qrPayload, async (value) => {
      url = value;
    });

    expect(url).toBe("ws://192.168.0.10:4173/?token=secret-token");
    expect(flow.getModel()).toEqual({ role: "ipad", status: "connected" });
  });

  it("exposes connector failures as an error state", async () => {
    const flow = new IpadConnectionFlow();
    await expect(flow.connect(createHostConnectionPanel(descriptor).qrPayload, async () => {
      throw new Error("offline");
    })).rejects.toThrow("offline");

    expect(flow.getModel()).toEqual({
      role: "ipad",
      status: "error",
      error: "offline"
    });
  });

  it("renders committed and active strokes into the preview context", () => {
    const calls: string[] = [];
    const context = {
      canvas: { width: 0, height: 0 },
      clearRect: () => calls.push("clear"),
      beginPath: () => calls.push("begin"),
      moveTo: () => calls.push("move"),
      lineTo: () => calls.push("line"),
      stroke: () => calls.push("stroke"),
      strokeStyle: "",
      lineCap: "round" as const,
      lineWidth: 0
    };

    renderPreviewState(context, {
      layout: "full-screen-preview",
      canvasWidth: 100,
      canvasHeight: 100,
      color: "#123456",
      brushSize: 4,
      tool: "pencil",
      strokes: [{
        id: "committed",
        seed: 1,
        brush: { kind: "pencil", size: 4, opacity: 1, density: 1 },
        points: [
          { x: 10, y: 10, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 0 },
          { x: 20, y: 20, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 1 }
        ]
      }],
      activeStroke: {
        id: "active",
        seed: 2,
        brush: { kind: "pencil", size: 4, opacity: 1, density: 1 },
        points: [{ x: 30, y: 30, pressure: 1, tiltX: 0, tiltY: 0, timeMs: 0 }]
      }
    });

    expect(context.canvas).toEqual({ width: 100, height: 100 });
    expect(calls).toEqual(["clear", "begin", "move", "line", "stroke", "begin", "move", "stroke"]);
  });
});
