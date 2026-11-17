import type { Stroke, StrokePoint } from "@papersketch/drawing";
import type { Renderer } from "@papersketch/engine-core";
import { GameEventBus, GameState } from "@papersketch/game-sdk";
import { IpadBridgeHost, type IpadPointerEvent, type IpadPreviewState } from "@papersketch/ipad-bridge";
import { JsonChannel } from "@papersketch/networking";
import type { ProjectManifest } from "@papersketch/project-schema";
import { createRuntime } from "@papersketch/runtime";

export interface ReferenceGameEvents {
  readonly [event: string]: unknown;
  "stroke-committed": Stroke;
  "pointer-received": IpadPointerEvent;
}

export interface ReferenceGameState {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly color: string;
  readonly brushSize: number;
  readonly tool: string;
  readonly strokes: readonly Stroke[];
  readonly activeStroke?: Stroke;
}

export interface ReferenceGame {
  readonly state: GameState<ReferenceGameState>;
  readonly events: GameEventBus<ReferenceGameEvents>;
  readonly runtime: ReturnType<typeof createRuntime>;
  publishPreview(): void;
  setStyle(style: Pick<ReferenceGameState, "color" | "brushSize" | "tool">): void;
  dispose(): void;
}

function createStroke(id: string, state: ReferenceGameState, point: StrokePoint): Stroke {
  return {
    id,
    seed: id.length,
    brush: {
      kind: state.tool === "eraser" ? "eraser" : "pencil",
      size: state.brushSize,
      opacity: state.tool === "eraser" ? 0 : 1,
      density: 1
    },
    points: [point]
  };
}

function toPoint(event: IpadPointerEvent, timeMs: number): StrokePoint {
  return {
    x: event.x,
    y: event.y,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    timeMs
  };
}

function createPreview(state: ReferenceGameState): IpadPreviewState {
  return {
    layout: "full-screen-preview",
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    color: state.color,
    brushSize: state.brushSize,
    tool: state.tool,
    strokes: state.strokes,
    activeStroke: state.activeStroke
  };
}

export function createReferenceGame(
  channel: JsonChannel,
  project: ProjectManifest,
  renderer: Renderer,
  dimensions = { width: 1, height: 1 }
): ReferenceGame {
  const state = new GameState<ReferenceGameState>({
    canvasWidth: dimensions.width,
    canvasHeight: dimensions.height,
    color: "#222222",
    brushSize: 4,
    tool: "pencil",
    strokes: []
  });
  const events = new GameEventBus<ReferenceGameEvents>();
  const bridge = new IpadBridgeHost(channel);
  const runtime = createRuntime(project, renderer);
  let strokeNumber = 0;
  let elapsedMs = 0;

  const handlePointer = (event: IpadPointerEvent): void => {
    events.emit("pointer-received", event);
    state.update((current) => {
      const point = toPoint(event, elapsedMs);
      if (event.phase === "start") {
        return {
          ...current,
          activeStroke: createStroke(`stroke-${++strokeNumber}`, current, point)
        };
      }
      if (!current.activeStroke) {
        return current;
      }
      const activeStroke: Stroke = {
        ...current.activeStroke,
        points: [...current.activeStroke.points, point]
      };
      if (event.phase === "end" || event.phase === "cancel") {
        events.emit("stroke-committed", activeStroke);
        return {
          ...current,
          strokes: [...current.strokes, activeStroke],
          activeStroke: undefined
        };
      }
      return { ...current, activeStroke };
    });
    publishPreview();
  };

  const unsubscribe = bridge.onPointer(handlePointer);
  const publishPreview = (): void => {
    bridge.publishPreview(createPreview(state.get()));
  };

  return {
    state,
    events,
    runtime,
    publishPreview,
    setStyle(style) {
      state.update((current) => ({ ...current, ...style }));
      publishPreview();
    },
    dispose() {
      unsubscribe();
      runtime.stop();
    }
  };
}
