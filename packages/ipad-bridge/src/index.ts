import type { Stroke } from "@papersketch/drawing";
import type { JsonChannel } from "@papersketch/networking";

export const IPAD_PREVIEW_MESSAGE = "ipad.preview" as const;
export const IPAD_POINTER_MESSAGE = "ipad.pointer" as const;

export interface IpadPreviewState {
  readonly layout: "full-screen-preview";
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly color: string;
  readonly brushSize: number;
  readonly tool: string;
  readonly strokes: readonly Stroke[];
  readonly activeStroke?: Stroke;
}

export interface IpadPointerEvent {
  readonly phase: "start" | "move" | "end" | "cancel";
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
}

function validatePointerEvent(event: IpadPointerEvent): void {
  if (!["start", "move", "end", "cancel"].includes(event.phase)) {
    throw new TypeError("iPad pointer phase is unsupported");
  }
  if (!Number.isInteger(event.pointerId) || event.pointerId < 0) {
    throw new RangeError("iPad pointer id must be a non-negative integer");
  }
  for (const value of [event.x, event.y, event.pressure, event.tiltX, event.tiltY]) {
    if (!Number.isFinite(value)) {
      throw new RangeError("iPad pointer values must be finite");
    }
  }
  if (event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) {
    throw new RangeError("iPad pointer coordinates must be normalized between 0 and 1");
  }
  if (event.pressure < 0 || event.pressure > 1) {
    throw new RangeError("iPad pointer pressure must be between 0 and 1");
  }
  if (event.tiltX < -90 || event.tiltX > 90 || event.tiltY < -90 || event.tiltY > 90) {
    throw new RangeError("iPad pointer tilt must be between -90 and 90 degrees");
  }
}

function isValidPointerEvent(value: unknown): value is IpadPointerEvent {
  try {
    validatePointerEvent(value as IpadPointerEvent);
    return typeof value === "object" && value !== null;
  } catch {
    return false;
  }
}

function isValidPreviewState(value: unknown): value is IpadPreviewState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = value as Partial<IpadPreviewState>;
  return state.layout === "full-screen-preview"
    && typeof state.canvasWidth === "number"
    && Number.isFinite(state.canvasWidth)
    && state.canvasWidth > 0
    && typeof state.canvasHeight === "number"
    && Number.isFinite(state.canvasHeight)
    && state.canvasHeight > 0
    && typeof state.color === "string"
    && state.color.length > 0
    && typeof state.brushSize === "number"
    && Number.isFinite(state.brushSize)
    && state.brushSize > 0
    && typeof state.tool === "string"
    && Array.isArray(state.strokes);
}

export class IpadBridgeHost {
  public constructor(private readonly channel: JsonChannel) {}

  public publishPreview(state: IpadPreviewState): void {
    if (!isValidPreviewState(state)) {
      throw new TypeError("Invalid iPad preview state");
    }
    this.channel.send(IPAD_PREVIEW_MESSAGE, state);
  }

  public onPointer(listener: (event: IpadPointerEvent) => void): () => void {
    return this.channel.subscribe<IpadPointerEvent>(IPAD_POINTER_MESSAGE, (event) => {
      validatePointerEvent(event);
      listener(event);
    }, isValidPointerEvent);
  }
}

export class IpadPreviewClient {
  private preview: IpadPreviewState | undefined;
  private readonly previewListeners = new Set<(state: IpadPreviewState) => void>();

  public constructor(private readonly channel: JsonChannel) {
    this.channel.subscribe<IpadPreviewState>(IPAD_PREVIEW_MESSAGE, (state) => {
      this.preview = state;
      for (const listener of this.previewListeners) {
        listener(state);
      }
    }, isValidPreviewState);
  }

  public getPreview(): IpadPreviewState | undefined {
    return this.preview;
  }

  public sendPointer(event: IpadPointerEvent): void {
    validatePointerEvent(event);
    this.channel.send(IPAD_POINTER_MESSAGE, event);
  }

  public onPreview(listener: (state: IpadPreviewState) => void): () => void {
    this.previewListeners.add(listener);
    return () => this.previewListeners.delete(listener);
  }
}
