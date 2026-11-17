export const NETWORK_PROTOCOL_VERSION = 1 as const;

export interface NetworkEnvelope<T> {
  readonly version: typeof NETWORK_PROTOCOL_VERSION;
  readonly type: string;
  readonly payload: T;
}

export interface MessageTransport {
  send(message: string): void;
  close(): void;
  subscribe(listener: (message: string) => void): () => void;
}

export interface JsonChannelOptions {
  readonly maxMessageBytes?: number;
  readonly onError?: (error: Error) => void;
}

export type PayloadValidator<T> = (payload: unknown) => payload is T;

export class JsonChannel {
  private readonly maxMessageBytes: number;

  public constructor(
    private readonly transport: MessageTransport,
    private readonly options: JsonChannelOptions = {}
  ) {
    this.maxMessageBytes = options.maxMessageBytes ?? 1_000_000;
    if (!Number.isInteger(this.maxMessageBytes) || this.maxMessageBytes <= 0) {
      throw new RangeError("maxMessageBytes must be a positive integer");
    }
  }

  public send<T>(type: string, payload: T): void {
    if (type.length === 0) {
      throw new TypeError("Network message type must not be empty");
    }
    const envelope: NetworkEnvelope<T> = {
      version: NETWORK_PROTOCOL_VERSION,
      type,
      payload
    };
    const message = JSON.stringify(envelope);
    if (message.length > this.maxMessageBytes) {
      throw new RangeError("Network message exceeds the configured size limit");
    }
    this.transport.send(message);
  }

  public subscribe<T>(
    type: string,
    listener: (payload: T) => void,
    validate?: PayloadValidator<T>
  ): () => void {
    return this.transport.subscribe((message) => {
      if (message.length > this.maxMessageBytes) {
        this.reportError(new RangeError("Network message exceeds the configured size limit"));
        return;
      }

      let envelope: unknown;
      try {
        envelope = JSON.parse(message);
      } catch (error) {
        this.reportError(new TypeError(`Invalid network message: ${String(error)}`));
        return;
      }

      if (
        typeof envelope !== "object"
        || envelope === null
        || (envelope as Record<string, unknown>).version !== NETWORK_PROTOCOL_VERSION
        || (envelope as Record<string, unknown>).type !== type
      ) {
        return;
      }

      const payload = (envelope as { payload: unknown }).payload;
      if (validate && !validate(payload)) {
        this.reportError(new TypeError(`Invalid payload for network message "${type}"`));
        return;
      }
      listener(payload as T);
    });
  }

  private reportError(error: Error): void {
    if (this.options.onError) {
      this.options.onError(error);
      return;
    }
    throw error;
  }
}

export function createLoopbackTransportPair(): readonly [MessageTransport, MessageTransport] {
  const listeners: [Set<(message: string) => void>, Set<(message: string) => void>] = [
    new Set(),
    new Set()
  ];

  const createTransport = (from: 0 | 1): MessageTransport => ({
    send(message) {
      for (const listener of listeners[1 - from]) {
        listener(message);
      }
    },
    close() {
      listeners[from].clear();
    },
    subscribe(listener) {
      listeners[from].add(listener);
      return () => listeners[from].delete(listener);
    }
  });

  return [createTransport(0), createTransport(1)];
}
