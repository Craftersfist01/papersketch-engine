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
});
