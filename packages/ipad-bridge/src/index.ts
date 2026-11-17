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
}

export class IpadBridgeHost {
  public constructor(private readonly channel: JsonChannel) {}

  public publishPreview(state: IpadPreviewState): void {
    if (state.layout !== "full-screen-preview") {
      throw new TypeError("iPad preview must use the full-screen-preview layout");
    }
    this.channel.send(IPAD_PREVIEW_MESSAGE, state);
  }

  public onPointer(listener: (event: IpadPointerEvent) => void): () => void {
    return this.channel.subscribe<IpadPointerEvent>(IPAD_POINTER_MESSAGE, (event) => {
      validatePointerEvent(event);
      listener(event);
    });
  }
}

export class IpadPreviewClient {
  private preview: IpadPreviewState | undefined;

  public constructor(private readonly channel: JsonChannel) {
    this.channel.subscribe<IpadPreviewState>(IPAD_PREVIEW_MESSAGE, (state) => {
      if (state.layout !== "full-screen-preview") {
        throw new TypeError("Unsupported iPad preview layout");
      }
      this.preview = state;
    });
  }

  public getPreview(): IpadPreviewState | undefined {
    return this.preview;
  }

  public sendPointer(event: IpadPointerEvent): void {
    validatePointerEvent(event);
    this.channel.send(IPAD_POINTER_MESSAGE, event);
  }
}
