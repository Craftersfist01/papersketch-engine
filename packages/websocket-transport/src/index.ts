import type { MessageTransport } from "@papersketch/networking";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

export const CONNECTION_DESCRIPTOR_VERSION = 1 as const;

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
}

export class WebSocketTransport implements MessageTransport {
  private readonly listeners = new Set<(message: string) => void>();
  private readonly onMessage = (event: { readonly data: unknown }): void => {
    if (typeof event.data !== "string") {
      throw new TypeError("WebSocket transport only accepts text messages");
    }
    for (const listener of this.listeners) {
      listener(event.data);
    }
  };
  private closed = false;

  public constructor(private readonly socket: WebSocketLike) {
    socket.addEventListener("message", this.onMessage);
  }

  public send(message: string): void {
    if (this.closed) {
      throw new Error("Cannot send on a closed WebSocket transport");
    }
    this.socket.send(message);
  }

  public close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.listeners.clear();
    this.socket.removeEventListener("message", this.onMessage);
    this.socket.close();
  }

  public subscribe(listener: (message: string) => void): () => void {
    if (this.closed) {
      throw new Error("Cannot subscribe to a closed WebSocket transport");
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface ConnectionDescriptor {
  readonly version: typeof CONNECTION_DESCRIPTOR_VERSION;
  readonly url: string;
  readonly token: string;
}

function assertWebSocketUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new TypeError(`Invalid WebSocket URL: ${String(error)}`);
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new TypeError("Connection URL must use ws: or wss:");
  }
}

export function createConnectionDescriptor(url: string, token: string): ConnectionDescriptor {
  assertWebSocketUrl(url);
  if (token.length === 0) {
    throw new TypeError("Connection token must not be empty");
  }
  return {
    version: CONNECTION_DESCRIPTOR_VERSION,
    url,
    token
  };
}

export function serializeConnectionDescriptor(descriptor: ConnectionDescriptor): string {
  const validated = createConnectionDescriptor(descriptor.url, descriptor.token);
  return `papersketch://connect?data=${encodeURIComponent(JSON.stringify(validated))}`;
}

export function parseConnectionDescriptor(payload: string): ConnectionDescriptor {
  let url: URL;
  try {
    url = new URL(payload);
  } catch (error) {
    throw new TypeError(`Invalid connection descriptor: ${String(error)}`);
  }
  if (url.protocol !== "papersketch:" || url.hostname !== "connect") {
    throw new TypeError("Unsupported connection descriptor scheme");
  }

  const encoded = url.searchParams.get("data");
  if (encoded === null) {
    throw new TypeError("Connection descriptor is missing data");
  }

  let value: unknown;
  try {
    value = JSON.parse(encoded);
  } catch (error) {
    throw new TypeError(`Invalid connection descriptor data: ${String(error)}`);
  }
  if (
    typeof value !== "object"
    || value === null
    || (value as Record<string, unknown>).version !== CONNECTION_DESCRIPTOR_VERSION
    || typeof (value as Record<string, unknown>).url !== "string"
    || typeof (value as Record<string, unknown>).token !== "string"
  ) {
    throw new TypeError("Invalid connection descriptor shape");
  }
  return createConnectionDescriptor(
    (value as { url: string }).url,
    (value as { token: string }).token
  );
}

export function createConnectionUrl(descriptor: ConnectionDescriptor): string {
  const validated = createConnectionDescriptor(descriptor.url, descriptor.token);
  const url = new URL(validated.url);
  url.searchParams.set("token", validated.token);
  return url.toString();
}

export interface LanHostOptions {
  readonly host?: string;
  readonly port?: number;
  readonly token: string;
  readonly onConnection: (transport: WebSocketTransport) => void;
}

export class LanWebSocketHost {
  private readonly server: WebSocketServer;
  private readonly listening: Promise<void>;

  public constructor(options: LanHostOptions) {
    if (options.token.length === 0) {
      throw new TypeError("LAN host token must not be empty");
    }

    this.server = new WebSocketServer({
      host: options.host ?? "0.0.0.0",
      port: options.port ?? 0,
      verifyClient: ({ req }: { readonly req: IncomingMessage }) => {
        const requestUrl = new URL(req.url ?? "/", "http://localhost");
        return requestUrl.searchParams.get("token") === options.token;
      }
    });
    this.listening = new Promise((resolve, reject) => {
      this.server.once("listening", resolve);
      this.server.once("error", reject);
    });
    this.server.on("connection", (socket: WebSocket) => {
      options.onConnection(new WebSocketTransport(socket));
    });
  }

  public ready(): Promise<void> {
    return this.listening;
  }

  public getAddress(): { readonly host: string; readonly port: number } {
    const address = this.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("LAN WebSocket host is not listening");
    }
    return {
      host: address.address,
      port: address.port
    };
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => error === undefined ? resolve() : reject(error));
    });
  }
}
