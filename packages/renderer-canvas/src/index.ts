import type { AssetStore } from "@papersketch/assets";
import { generateBrushMarks, type BrushMark, type Stroke } from "@papersketch/drawing";
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
  ellipse?(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  fill?(): void;
  clip?(): void;
  globalAlpha: number;
  globalCompositeOperation?: string;
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
    this.renderStrokes(frame.strokes ?? []);
  }

  private renderStrokes(strokes: readonly Stroke[]): void {
    for (const stroke of strokes) {
      const marks = generateBrushMarks(stroke);
      this.context.save();
      this.context.fillStyle = stroke.brush.color ?? "#222222";
      for (const mark of marks) {
        this.context.globalAlpha = mark.alpha;
        if (mark.erase && this.context.globalCompositeOperation !== undefined) {
          this.context.globalCompositeOperation = "destination-out";
        }
        this.renderMark(mark);
      }
      this.context.restore();
    }
  }

  private renderMark(mark: BrushMark): void {
    const radius = mark.size / 2;
    const radiusY = radius * (1 + (1 - mark.hardness) * 0.6);
    if (this.context.beginPath && this.context.fill) {
      this.context.beginPath();
      if (this.context.ellipse) {
        this.context.ellipse(mark.x, mark.y, radius, radiusY, mark.rotation, 0, Math.PI * 2);
      } else if (this.context.arc) {
        this.context.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
      }
      this.context.fill();
      return;
    }
    this.context.fillRect(mark.x - radius, mark.y - radiusY, mark.size, radiusY * 2);
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
