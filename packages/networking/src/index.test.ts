import { describe, expect, it } from "vitest";
import { createLoopbackTransportPair, JsonChannel } from "./index.js";

describe("JsonChannel", () => {
  it("serializes typed messages across a transport", () => {
    const [hostTransport, clientTransport] = createLoopbackTransportPair();
    const host = new JsonChannel(hostTransport);
    const client = new JsonChannel(clientTransport);
    let received: { value: number } | undefined;

    client.subscribe<{ value: number }>("test", (payload) => {
      received = payload;
    });
    host.send("test", { value: 42 });

    expect(received).toEqual({ value: 42 });
  });

  it("ignores other protocol message types", () => {
    const [first, second] = createLoopbackTransportPair();
    const sender = new JsonChannel(first);
    const receiver = new JsonChannel(second);
    let count = 0;
    receiver.subscribe("expected", () => { count += 1; });

    sender.send("other", {});

    expect(count).toBe(0);
  });

  it("validates payloads and reports malformed messages without throwing", () => {
    const [senderTransport, receiverTransport] = createLoopbackTransportPair();
    const errors: Error[] = [];
    const receiver = new JsonChannel(receiverTransport, {
      onError: (error) => errors.push(error)
    });
    receiver.subscribe<{ value: number }>(
      "test",
      () => undefined,
      (payload): payload is { value: number } =>
        typeof payload === "object"
        && payload !== null
        && typeof (payload as { value?: unknown }).value === "number"
    );

    senderTransport.send("{not-json");
    senderTransport.send(JSON.stringify({
      version: 1,
      type: "test",
      payload: { value: "invalid" }
    }));

    expect(errors).toHaveLength(2);
    expect(errors[0]).toBeInstanceOf(TypeError);
  });

  it("rejects oversized messages", () => {
    const [senderTransport, receiverTransport] = createLoopbackTransportPair();
    const receiver = new JsonChannel(receiverTransport, { maxMessageBytes: 32 });
    receiver.subscribe("test", () => undefined);

    expect(() => senderTransport.send(JSON.stringify({
      version: 1,
      type: "test",
      payload: "this payload is too large"
    }))).toThrow("size limit");
  });
});
