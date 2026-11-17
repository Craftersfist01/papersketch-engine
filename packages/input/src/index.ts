export type PointerDevice = "mouse" | "touch" | "pen" | "unknown";
export type PointerAction = "draw" | "pan" | "select";

export interface PointerEventLike {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly pressure?: number;
  readonly tiltX?: number;
  readonly tiltY?: number;
  readonly buttons?: number;
  readonly timeStamp?: number;
}

export interface PointerSample {
  readonly pointerId: number;
  readonly device: PointerDevice;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly buttons: number;
  readonly timeMs: number;
}

export interface InputPolicy {
  readonly pen: PointerAction;
  readonly touch: PointerAction;
  readonly mouse: PointerAction;
  readonly unknown: PointerAction;
}

export const DEFAULT_INPUT_POLICY: InputPolicy = {
  pen: "draw",
  touch: "pan",
  mouse: "select",
  unknown: "select"
};

function normalizeDevice(pointerType: string): PointerDevice {
  if (pointerType === "pen" || pointerType === "touch" || pointerType === "mouse") {
    return pointerType;
  }
  return "unknown";
}

export function normalizePointerSample(event: PointerEventLike): PointerSample {
  const pressure = event.pressure ?? 0;
  if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) {
    throw new RangeError("Pointer pressure must be between 0 and 1");
  }

  return {
    pointerId: event.pointerId,
    device: normalizeDevice(event.pointerType),
    x: event.clientX,
    y: event.clientY,
    pressure,
    tiltX: event.tiltX ?? 0,
    tiltY: event.tiltY ?? 0,
    buttons: event.buttons ?? 0,
    timeMs: event.timeStamp ?? 0
  };
}

export function resolvePointerAction(
  sample: PointerSample,
  policy: InputPolicy = DEFAULT_INPUT_POLICY
): PointerAction {
  return policy[sample.device];
}
