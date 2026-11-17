import { describe, expect, it } from "vitest";
import {
  WebSocketTransport,
  createConnectionDescriptor,
  parseConnectionDescriptor,
  serializeConnectionDescriptor
} from "./index.js";

class FakeSocket {
  public readonly sent: string[] = [];
  private readonly listeners = new Set<(event: { readonly data: unknown }) => void>();
  public closed = false;

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.closed = true;
  }

  public addEventListener(
    _type: "message",
    listener: (event: { readonly data: unknown }) => void
  ): void {
    this.listeners.add(listener);
  }

  public removeEventListener(
    _type: "message",
    listener: (event: { readonly data: unknown }) => void
  ): void {
    this.listeners.delete(listener);
  }

  public receive(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data });
    }
  }
}

describe("WebSocketTransport", () => {
  it("adapts text WebSocket messages to MessageTransport", () => {
    const socket = new FakeSocket();
    const transport = new WebSocketTransport(socket);
    const messages: string[] = [];
    transport.subscribe((message) => messages.push(message));

    socket.receive("hello");
    transport.send("outgoing");

    expect(messages).toEqual(["hello"]);
    expect(socket.sent).toEqual(["outgoing"]);
  });

  it("rejects binary messages and prevents sends after close", () => {
    const socket = new FakeSocket();
    const transport = new WebSocketTransport(socket);

    expect(() => socket.receive(new Uint8Array([1]))).toThrow(TypeError);
    transport.close();

    expect(socket.closed).toBe(true);
    expect(() => transport.send("late")).toThrow("closed WebSocket");
  });
});

describe("connection descriptors", () => {
  it("round-trips QR-ready connection data", () => {
    const descriptor = createConnectionDescriptor("ws://192.168.0.10:4173", "secret-token");
    const encoded = serializeConnectionDescriptor(descriptor);

    expect(parseConnectionDescriptor(encoded)).toEqual(descriptor);
  });

  it("rejects non-WebSocket URLs", () => {
    expect(() => createConnectionDescriptor("https://example.test", "token")).toThrow("ws:");
  });
});
