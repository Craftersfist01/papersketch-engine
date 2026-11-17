import {
  createConnectionUrl,
  parseConnectionDescriptor,
  serializeConnectionDescriptor,
  type ConnectionDescriptor
} from "@papersketch/websocket-transport";
import type { IpadPreviewClient, IpadPreviewState } from "@papersketch/ipad-bridge";
import QRCode from "qrcode";

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

export async function renderQrCode(payload: string, canvas: HTMLCanvasElement): Promise<void> {
  await QRCode.toCanvas(canvas, payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256
  });
}

export interface QrScanner {
  start(video: HTMLVideoElement, onPayload: (payload: string) => void): Promise<void>;
  stop(): void;
}

export interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<readonly { readonly rawValue?: string }[]>;
}

export class BrowserQrScanner implements QrScanner {
  private running = false;
  private animationFrame: number | undefined;

  public constructor(private readonly detector: BarcodeDetectorLike) {}

  public async start(video: HTMLVideoElement, onPayload: (payload: string) => void): Promise<void> {
    this.stop();
    this.running = true;
    await video.play();
    const scan = async (): Promise<void> => {
      if (!this.running) {
        return;
      }
      const results = await this.detector.detect(video);
      const payload = results.find((result) => result.rawValue)?.rawValue;
      if (payload !== undefined) {
        onPayload(payload);
        this.stop();
        return;
      }
      this.animationFrame = requestAnimationFrame(() => { void scan(); });
    };
    await scan();
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }
}

export interface ConnectionPanelOptions {
  readonly root: HTMLElement;
  readonly hostModel?: HostConnectionPanelModel;
  readonly ipadFlow?: IpadConnectionFlow;
  readonly scanner?: QrScanner;
  readonly connector?: ConnectionConnector;
}

export function createConnectionPanel(options: ConnectionPanelOptions): void {
  options.root.replaceChildren();
  const status = document.createElement("p");
  const heading = document.createElement("h2");
  options.root.append(heading, status);

  if (options.hostModel) {
    heading.textContent = "iPad verbinden";
    const canvas = document.createElement("canvas");
    const code = document.createElement("code");
    code.textContent = options.hostModel.connectionUrl;
    status.textContent = "Warte auf iPad-Verbindung";
    options.root.append(canvas, code);
    void renderQrCode(options.hostModel.qrPayload, canvas);
    return;
  }

  if (!options.ipadFlow || !options.scanner || !options.connector) {
    throw new TypeError("iPad connection panel requires flow, scanner, and connector");
  }
  heading.textContent = "Mit PC verbinden";
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  const button = document.createElement("button");
  button.textContent = "QR-Code scannen";
  button.addEventListener("click", () => {
    status.textContent = "Scanne QR-Code ...";
    void options.scanner?.start(video, (payload) => {
      void options.ipadFlow?.connect(payload, options.connector as ConnectionConnector)
        .then(() => { status.textContent = "Verbunden"; })
        .catch((error: unknown) => {
          status.textContent = error instanceof Error ? error.message : String(error);
        });
    });
  });
  options.root.append(video, button);
}

export interface PreviewCanvasContext {
  readonly canvas: { width: number; height: number };
  clearRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineCap: CanvasLineCap;
  lineWidth: number;
}

export function renderPreviewState(
  context: PreviewCanvasContext,
  state: IpadPreviewState
): void {
  const canvas = context.canvas;
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = state.color;
  context.lineCap = "round";
  const strokes = state.activeStroke === undefined
    ? state.strokes
    : [...state.strokes, state.activeStroke];
  for (const stroke of strokes) {
    context.lineWidth = stroke.brush.size;
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x / state.canvasWidth * canvas.width;
      const y = point.y / state.canvasHeight * canvas.height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();
  }
}

export function bindPreviewCanvas(
  canvas: HTMLCanvasElement,
  client: IpadPreviewClient
): () => void {
  return client.onPreview((state) => {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Preview canvas does not provide a 2D context");
    }
    renderPreviewState(context, state);
  });
}
