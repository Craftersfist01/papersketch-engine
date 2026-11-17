import {
  createConnectionUrl,
  parseConnectionDescriptor,
  serializeConnectionDescriptor,
  type ConnectionDescriptor
} from "@papersketch/websocket-transport";

export type HostConnectionStatus = "waiting" | "connected";

export interface HostConnectionPanelModel {
  readonly role: "host";
  readonly status: HostConnectionStatus;
  readonly connectionUrl: string;
  readonly qrPayload: string;
}

export function createHostConnectionPanel(
  descriptor: ConnectionDescriptor
): HostConnectionPanelModel {
  return {
    role: "host",
    status: "waiting",
    connectionUrl: createConnectionUrl(descriptor),
    qrPayload: serializeConnectionDescriptor(descriptor)
  };
}

export function setHostConnectionStatus(
  model: HostConnectionPanelModel,
  status: HostConnectionStatus
): HostConnectionPanelModel {
  return { ...model, status };
}

export type IpadConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface IpadConnectionPanelModel {
  readonly role: "ipad";
  readonly status: IpadConnectionStatus;
  readonly error?: string;
}

export type ConnectionConnector = (url: string) => Promise<void>;

export class IpadConnectionFlow {
  private model: IpadConnectionPanelModel = {
    role: "ipad",
    status: "idle"
  };

  public getModel(): IpadConnectionPanelModel {
    return this.model;
  }

  public async connect(payload: string, connector: ConnectionConnector): Promise<void> {
    const descriptor = parseConnectionDescriptor(payload);
    this.model = { role: "ipad", status: "connecting" };
    try {
      await connector(createConnectionUrl(descriptor));
      this.model = { role: "ipad", status: "connected" };
    } catch (error) {
      this.model = {
        role: "ipad",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }
  }

  public reset(): void {
    this.model = { role: "ipad", status: "idle" };
  }
}
