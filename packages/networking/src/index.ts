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

export class JsonChannel {
  public constructor(private readonly transport: MessageTransport) {}

  public send<T>(type: string, payload: T): void {
    const envelope: NetworkEnvelope<T> = {
      version: NETWORK_PROTOCOL_VERSION,
      type,
      payload
    };
    this.transport.send(JSON.stringify(envelope));
  }

  public subscribe<T>(type: string, listener: (payload: T) => void): () => void {
    return this.transport.subscribe((message) => {
      let envelope: unknown;
      try {
        envelope = JSON.parse(message);
      } catch (error) {
        throw new TypeError(`Invalid network message: ${String(error)}`);
      }

      if (
        typeof envelope !== "object"
        || envelope === null
        || (envelope as Record<string, unknown>).version !== NETWORK_PROTOCOL_VERSION
        || (envelope as Record<string, unknown>).type !== type
      ) {
        return;
      }

      listener((envelope as { payload: T }).payload);
    });
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
