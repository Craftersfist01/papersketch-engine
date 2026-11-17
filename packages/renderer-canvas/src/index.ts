import type { AssetStore } from "@papersketch/assets";
import type { RenderFrame, Renderer } from "@papersketch/engine-core";

export interface CanvasContextLike {
  clearRect(x: number, y: number, width: number, height: number): void;
  drawImage(image: unknown, x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  restore(): void;
  save(): void;
  rotate(angle: number): void;
  translate(x: number, y: number): void;
  beginPath?(): void;
  closePath?(): void;
  rect?(x: number, y: number, width: number, height: number): void;
  arc?(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  clip?(): void;
  globalAlpha: number;
  fillStyle: string;
}

export interface CanvasRendererOptions {
  readonly width: number;
  readonly height: number;
  readonly assetStore?: AssetStore;
}

export class CanvasRenderer implements Renderer {
  public constructor(
    private readonly context: CanvasContextLike,
    private readonly options: CanvasRendererOptions
  ) {}

  public render(frame: RenderFrame): void {
    this.context.clearRect(0, 0, this.options.width, this.options.height);

    for (const component of frame.components) {
      const { bounds } = component.definition;
      this.context.save();
      this.context.translate(bounds.x, bounds.y);
      this.context.rotate((bounds.rotation * Math.PI) / 180);
      this.applyClip(component.definition.zones);

      const layers = [...component.definition.layers].sort((a, b) => a.order - b.order);
      if (layers.length === 0) {
        this.context.fillStyle = "#d9d9d9";
        this.context.globalAlpha = 1;
        this.context.fillRect(0, 0, bounds.width, bounds.height);
      }

      for (const layer of layers) {
        if (!layer.visible) {
          continue;
        }

        this.context.globalAlpha = layer.opacity;
        const asset = layer.assetId ? this.options.assetStore?.get(layer.assetId) : undefined;
        if (asset?.data !== undefined) {
          this.context.drawImage(asset.data, 0, 0, bounds.width, bounds.height);
        } else {
          this.context.fillStyle = "#d9d9d9";
          this.context.fillRect(0, 0, bounds.width, bounds.height);
        }
      }

      this.context.restore();
    }
  }

  private applyClip(zones: RenderFrame["components"][number]["definition"]["zones"]): void {
    const zone = zones.find((candidate) => candidate.clip);
    if (!zone || !this.context.beginPath || !this.context.clip) {
      return;
    }

    if (zone.shape.type === "rectangle" && this.context.rect) {
      this.context.beginPath();
      this.context.rect(zone.shape.x, zone.shape.y, zone.shape.width, zone.shape.height);
      this.context.clip();
    } else if (zone.shape.type === "circle" && this.context.arc) {
      this.context.beginPath();
      this.context.arc(zone.shape.cx, zone.shape.cy, zone.shape.radius, 0, Math.PI * 2);
      this.context.clip();
    }
  }
}
