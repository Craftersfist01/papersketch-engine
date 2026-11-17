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

export type PointerSessionPhase = "start" | "move" | "end" | "cancel";

export interface PointerSession {
  readonly pointerId: number;
  readonly device: PointerDevice;
  readonly action: PointerAction;
  readonly phase: PointerSessionPhase;
  readonly startedAt: number;
  readonly last: PointerSample;
  readonly samples: readonly PointerSample[];
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
  if (!Number.isInteger(event.pointerId) || event.pointerId < 0) {
    throw new RangeError("Pointer id must be a non-negative integer");
  }
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    throw new RangeError("Pointer coordinates must be finite numbers");
  }
  const pressure = event.pressure ?? 0;
  if (!Number.isFinite(pressure) || pressure < 0 || pressure > 1) {
    throw new RangeError("Pointer pressure must be between 0 and 1");
  }
  const tiltX = event.tiltX ?? 0;
  const tiltY = event.tiltY ?? 0;
  if (!Number.isFinite(tiltX) || !Number.isFinite(tiltY)) {
    throw new RangeError("Pointer tilt must be finite numbers");
  }
  const buttons = event.buttons ?? 0;
  if (!Number.isInteger(buttons) || buttons < 0) {
    throw new RangeError("Pointer buttons must be a non-negative integer");
  }
  const timeMs = event.timeStamp ?? 0;
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new RangeError("Pointer timestamp must be a non-negative finite number");
  }

  return {
    pointerId: event.pointerId,
    device: normalizeDevice(event.pointerType),
    x: event.clientX,
    y: event.clientY,
    pressure,
    tiltX,
    tiltY,
    buttons,
    timeMs
  };
}

export function resolvePointerAction(
  sample: PointerSample,
  policy: InputPolicy = DEFAULT_INPUT_POLICY
): PointerAction {
  return policy[sample.device];
}

export class PointerSessionManager {
  private readonly sessions = new Map<number, PointerSession>();

  public constructor(
    private readonly policy: InputPolicy = DEFAULT_INPUT_POLICY,
    private readonly maxSamples = 4096
  ) {
    if (!Number.isInteger(maxSamples) || maxSamples < 2) {
      throw new RangeError("Pointer session sample limit must be at least 2");
    }
  }

  public begin(sample: PointerSample): PointerSession {
    if (this.sessions.has(sample.pointerId)) {
      throw new RangeError(`Pointer ${sample.pointerId} already has an active session`);
    }
    const session: PointerSession = {
      pointerId: sample.pointerId,
      device: sample.device,
      action: resolvePointerAction(sample, this.policy),
      phase: "start",
      startedAt: sample.timeMs,
      last: sample,
      samples: [sample]
    };
    this.sessions.set(sample.pointerId, session);
    return session;
  }

  public update(sample: PointerSample): PointerSession {
    const current = this.getActive(sample.pointerId);
    if (sample.timeMs < current.last.timeMs) {
      throw new RangeError("Pointer session timestamps must not move backwards");
    }
    if (current.samples.length >= this.maxSamples) {
      throw new RangeError("Pointer session sample limit exceeded");
    }
    const session: PointerSession = {
      ...current,
      phase: "move",
      last: sample,
      samples: [...current.samples, sample]
    };
    this.sessions.set(sample.pointerId, session);
    return session;
  }

  public end(sample: PointerSample, cancelled = false): PointerSession {
    const current = this.getActive(sample.pointerId);
    if (sample.timeMs < current.last.timeMs) {
      throw new RangeError("Pointer session timestamps must not move backwards");
    }
    const session: PointerSession = {
      ...current,
      phase: cancelled ? "cancel" : "end",
      last: sample,
      samples: [...current.samples, sample]
    };
    this.sessions.delete(sample.pointerId);
    return session;
  }

  public get(pointerId: number): PointerSession | undefined {
    return this.sessions.get(pointerId);
  }

  public active(): readonly PointerSession[] {
    return [...this.sessions.values()];
  }

  public cancelAll(): readonly PointerSession[] {
    const cancelled = [...this.sessions.values()].map((session) => ({
      ...session,
      phase: "cancel" as const
    }));
    this.sessions.clear();
    return cancelled;
  }

  private getActive(pointerId: number): PointerSession {
    const session = this.sessions.get(pointerId);
    if (!session) {
      throw new RangeError(`Pointer ${pointerId} has no active session`);
    }
    return session;
  }
}
