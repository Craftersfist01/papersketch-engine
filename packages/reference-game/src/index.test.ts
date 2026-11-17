import { describe, expect, it, vi } from "vitest";
import type { Renderer } from "@papersketch/engine-core";
import { createLoopbackTransportPair, JsonChannel } from "@papersketch/networking";
import type { ProjectManifest } from "@papersketch/project-schema";
import { IpadPreviewClient } from "@papersketch/ipad-bridge";
import { createReferenceGame } from "./index.js";

const project: ProjectManifest = {
  schemaVersion: 2,
  id: "reference-project",
  name: "Reference Project",
  scenes: [{ id: "main", name: "Main", rootComponentIds: ["canvas"] }],
  components: [{
    id: "canvas",
    name: "Canvas",
    functionKey: "reference.canvas",
    bounds: { x: 0, y: 0, width: 1, height: 1, rotation: 0 },
    layers: [],
    zones: []
  }],
  assets: []
};

describe("reference game", () => {
  it("integrates runtime, game state, iPad bridge and pointer input", () => {
    const [hostTransport, clientTransport] = createLoopbackTransportPair();
    const client = new IpadPreviewClient(new JsonChannel(clientTransport));
    const renderer: Renderer = { render: vi.fn() };
    const game = createReferenceGame(
      new JsonChannel(hostTransport),
      project,
      renderer,
      { width: 100, height: 100 }
    );
    game.runtime.start();
    game.setStyle({ color: "#ff0000", brushSize: 8, tool: "pencil" });
    game.publishPreview();
    client.sendPointer({
      phase: "start",
      pointerId: 1,
      x: 0.1,
      y: 0.2,
      pressure: 1,
      tiltX: 0,
      tiltY: 0
    });
    client.sendPointer({
      phase: "end",
      pointerId: 1,
      x: 0.4,
      y: 0.5,
      pressure: 1,
      tiltX: 0,
      tiltY: 0
    });

    expect(game.state.get().strokes).toHaveLength(1);
    expect(game.state.get().strokes[0].brush.size).toBe(8);
    expect(client.getPreview()).toMatchObject({
      color: "#ff0000",
      brushSize: 8,
      strokes: [{ id: "stroke-1" }]
    });
    expect(renderer.render).toHaveBeenCalled();
    game.dispose();
  });
});
