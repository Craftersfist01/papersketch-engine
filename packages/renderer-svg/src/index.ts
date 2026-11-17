import type { AssetStore } from "@papersketch/assets";
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

    this.target.setMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.options.width}" height="${this.options.height}" data-project-id="${escapeXml(frame.projectId)}"><defs>${definitions.join("")}</defs>${components}</svg>`
    );
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
