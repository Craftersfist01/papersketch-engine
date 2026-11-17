import { describe, expect, it } from "vitest";
import { createConnectionDescriptor } from "@papersketch/websocket-transport";
import {
  IpadConnectionFlow,
  createHostConnectionPanel,
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
});
