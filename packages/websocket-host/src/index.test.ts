import { WebSocket } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { LanWebSocketHost } from "./index.js";

const hosts: LanWebSocketHost[] = [];

afterEach(async () => {
  await Promise.all(hosts.splice(0).map((host) => host.close()));
});

describe("LanWebSocketHost", () => {
  it("accepts a tokenized connection and exposes it as a transport", async () => {
    const received: string[] = [];
    const host = new LanWebSocketHost({
      token: "0123456789abcdef",
      onConnection: (transport) => transport.subscribe((message) => received.push(message))
    });
    hosts.push(host);
    await host.ready();
    const address = host.getAddress();
    const client = new WebSocket(`ws://127.0.0.1:${address.port}/?token=0123456789abcdef`);

    await new Promise<void>((resolve, reject) => {
      client.once("open", () => {
        client.send("hello");
        resolve();
      });
      client.once("error", reject);
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received).toEqual(["hello"]);
    client.close();
  });

  it("rejects weak host tokens", () => {
    expect(() => new LanWebSocketHost({
      token: "short",
      onConnection: () => undefined
    })).toThrow("at least 16");
  });
});
