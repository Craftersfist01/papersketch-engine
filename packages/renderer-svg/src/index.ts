import type { AssetStore } from "@papersketch/assets";
import { generateBrushMarks, type BrushMark, type Stroke } from "@papersketch/drawing";
import type { RenderFrame, Renderer } from "@papersketch/engine-core";

export interface SvgTarget {
  setMarkup(markup: string): void;
}

export interface SvgRendererOptions {
  readonly width: number;
  readonly height: number;
  readonly assetStore?: AssetStore;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function assertSafeImageSource(source: string): void {
  const normalized = source.trim().toLowerCase();
  if (
    normalized.startsWith("javascript:")
    || normalized.startsWith("vbscript:")
    || normalized.startsWith("data:text/html")
    || normalized.startsWith("data:application/javascript")
  ) {
    throw new TypeError("Unsafe SVG asset source");
  }
}

function assertSafeColor(color: string): void {
  if (!/^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|[a-z]+)$/i.test(color)) {
    throw new TypeError("Unsafe drawing color");
  }
}

export class SvgRenderer implements Renderer {
  public constructor(
    private readonly target: SvgTarget,
    private readonly options: SvgRendererOptions
  ) {}

  public render(frame: RenderFrame): void {
    const definitions: string[] = [];
    const components = frame.components.map((component, index) => {
      const { bounds } = component.definition;
      const clipZone = component.definition.zones.find((zone) => zone.clip);
      const clipId = `clip-${index}`;
      const layers = [...component.definition.layers]
        .filter((layer) => layer.visible)
        .sort((a, b) => a.order - b.order);
      const content = layers.length === 0
        ? `<rect width="${bounds.width}" height="${bounds.height}" fill="#d9d9d9"/>`
        : layers.map((layer) => {
            const asset = layer.assetId ? this.options.assetStore?.get(layer.assetId) : undefined;
            const source = asset?.definition.source;
            if (source) {
              assertSafeImageSource(source);
            }
            return source
              ? `<image href="${escapeXml(source)}" width="${bounds.width}" height="${bounds.height}" opacity="${layer.opacity}"/>`
              : `<rect width="${bounds.width}" height="${bounds.height}" fill="#d9d9d9" opacity="${layer.opacity}"/>`;
          }).join("");
      const clipPath = clipZone
        ? `<clipPath id="${clipId}">${this.renderZoneShape(clipZone.shape)}</clipPath>`
        : "";
      if (clipPath) {
        definitions.push(clipPath);
      }
      const clipAttribute = clipZone ? ` clip-path="url(#${clipId})"` : "";

      return `${clipPath}<g data-component-id="${escapeXml(component.id)}" transform="translate(${bounds.x} ${bounds.y}) rotate(${bounds.rotation})"${clipAttribute}>${content}</g>`;
    }).join("");
    const strokeMarkup = this.renderStrokes(frame.strokes ?? [], definitions);

    this.target.setMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.options.width}" height="${this.options.height}" data-project-id="${escapeXml(frame.projectId)}"><defs>${definitions.join("")}</defs>${components}${strokeMarkup}</svg>`
    );
  }

  private renderStrokes(strokes: readonly Stroke[], definitions: string[]): string {
    const marks = strokes.flatMap((stroke) => generateBrushMarks(stroke).map((mark) => ({
      mark,
      color: stroke.brush.color ?? "#222222",
      id: stroke.id
    })));
    if (marks.length === 0) {
      return "";
    }
    const eraseMarks = marks.filter(({ mark }) => mark.erase);
    const drawingMarks = marks.filter(({ mark }) => !mark.erase);
    const maskId = "drawing-erase-mask";
    if (eraseMarks.length > 0) {
      definitions.push(
        `<mask id="${maskId}"><rect width="${this.options.width}" height="${this.options.height}" fill="white"/>${eraseMarks.map(({ mark }) => this.renderMark(mark, "#000000")).join("")}</mask>`
      );
    }
    return `<g data-layer="drawing"${eraseMarks.length > 0 ? ` mask="url(#${maskId})"` : ""}>${drawingMarks.map(({ mark, color, id }) => this.renderMark(mark, color, id)).join("")}</g>`;
  }

  private renderMark(mark: BrushMark, color: string, strokeId?: string): string {
    assertSafeColor(color);
    const radius = mark.size / 2;
    const radiusY = radius * (1 + (1 - mark.hardness) * 0.6);
    const id = strokeId ? ` data-stroke-id="${escapeXml(strokeId)}"` : "";
    return `<ellipse${id} cx="${mark.x}" cy="${mark.y}" rx="${radius}" ry="${radiusY}" transform="rotate(${mark.rotation * 180 / Math.PI} ${mark.x} ${mark.y})" fill="${escapeXml(color)}" opacity="${mark.alpha}"/>`;
  }

  private renderZoneShape(shape: RenderFrame["components"][number]["definition"]["zones"][number]["shape"]): string {
    if (shape.type === "rectangle") {
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"/>`;
    }
    if (shape.type === "circle") {
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.radius}"/>`;
    }
    return `<path d="${escapeXml(shape.data)}"/>`;
  }
}
