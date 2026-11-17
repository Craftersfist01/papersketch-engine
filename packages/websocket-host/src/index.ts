import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { WebSocketTransport } from "@papersketch/websocket-transport";

export interface LanHostOptions {
  readonly host?: string;
  readonly port?: number;
  readonly token: string;
  readonly onConnection: (transport: WebSocketTransport) => void;
}

function tokensMatch(actual: string | null, expected: string): boolean {
  if (actual === null) {
    return false;
  }
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length
    && timingSafeEqual(actualBytes, expectedBytes);
}

export class LanWebSocketHost {
  private readonly server: WebSocketServer;
  private readonly listening: Promise<void>;

  public constructor(options: LanHostOptions) {
    if (options.token.length < 16) {
      throw new RangeError("LAN host token must contain at least 16 characters");
    }

    this.server = new WebSocketServer({
      host: options.host ?? "0.0.0.0",
      port: options.port ?? 0,
      verifyClient: ({ req }: { readonly req: IncomingMessage }) => {
        const requestUrl = new URL(req.url ?? "/", "http://localhost");
        return tokensMatch(requestUrl.searchParams.get("token"), options.token);
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
    return { host: address.address, port: address.port };
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => error === undefined ? resolve() : reject(error));
    });
  }
}
