import {
  parseProjectManifest,
  type Bounds,
  type ComponentDefinition,
  type ProjectManifest
} from "@papersketch/project-schema";

export interface ComponentPatch {
  readonly name?: string;
  readonly functionKey?: string;
  readonly bounds?: Partial<Bounds>;
}

export interface LayerPatch {
  readonly name?: string;
  readonly order?: number;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly assetId?: string;
}

export interface EditorState {
  readonly project: ProjectManifest;
  readonly selectedComponentIds: readonly string[];
  readonly selectedLayerIds: readonly string[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

function replaceComponent(
  project: ProjectManifest,
  componentId: string,
  update: (component: ComponentDefinition) => ComponentDefinition
): ProjectManifest {
  let found = false;
  const components = project.components.map((component) => {
    if (component.id !== componentId) {
      return component;
    }
    found = true;
    return update(component);
  });

  if (!found) {
    throw new RangeError(`Unknown component "${componentId}"`);
  }

  return parseProjectManifest({ ...project, components });
}

function replaceLayer(
  project: ProjectManifest,
  componentId: string,
  layerId: string,
  update: (layer: ComponentDefinition["layers"][number]) => ComponentDefinition["layers"][number]
): ProjectManifest {
  let foundComponent = false;
  let foundLayer = false;
  const components = project.components.map((component) => {
    if (component.id !== componentId) {
      return component;
    }
    foundComponent = true;
    const layers = component.layers.map((layer) => {
      if (layer.id !== layerId) {
        return layer;
      }
      foundLayer = true;
      return update(layer);
    });
    return { ...component, layers };
  });
  if (!foundComponent) {
    throw new RangeError(`Unknown component "${componentId}"`);
  }
  if (!foundLayer) {
    throw new RangeError(`Unknown layer "${layerId}"`);
  }
  return parseProjectManifest({ ...project, components });
}

function mergeBounds(bounds: Bounds, patch: Partial<Bounds>): Bounds {
  const next = { ...bounds, ...patch };
  if (![next.x, next.y, next.width, next.height, next.rotation].every(Number.isFinite)) {
    throw new RangeError("Component bounds must contain finite numbers");
  }
  if (next.width < 0 || next.height < 0) {
    throw new RangeError("Component width and height must not be negative");
  }
  return next;
}

export function hitTestComponent(
  project: ProjectManifest,
  sceneId: string,
  x: number,
  y: number
): string | undefined {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError("Hit-test coordinates must be finite numbers");
  }

  const scene = project.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    throw new RangeError(`Unknown scene "${sceneId}"`);
  }

  const components = new Map(project.components.map((component) => [component.id, component]));
  for (const componentId of [...scene.rootComponentIds].reverse()) {
    const component = components.get(componentId);
    if (!component) {
      continue;
    }
    const { x: left, y: top, width, height } = component.bounds;
    if (x >= left && x <= left + width && y >= top && y <= top + height) {
      return component.id;
    }
  }

  return undefined;
}

export class EditorSession {
  private project: ProjectManifest;
  private selectedComponentIds: string[] = [];
  private selectedLayerIds: string[] = [];
  private readonly undoStack: ProjectManifest[] = [];
  private readonly redoStack: ProjectManifest[] = [];

  public constructor(project: ProjectManifest) {
    this.project = parseProjectManifest(project);
  }

  public getState(): EditorState {
    return {
      project: this.project,
      selectedComponentIds: [...this.selectedComponentIds],
      selectedLayerIds: [...this.selectedLayerIds],
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0
    };
  }

  public selectComponents(componentIds: readonly string[]): void {
    const knownIds = new Set(this.project.components.map((component) => component.id));
    const uniqueIds = [...new Set(componentIds)];
    if (uniqueIds.some((id) => !knownIds.has(id))) {
      throw new RangeError("Selection contains an unknown component");
    }
    this.selectedComponentIds = uniqueIds;
  }

  public selectAt(sceneId: string, x: number, y: number): string | undefined {
    const componentId = hitTestComponent(this.project, sceneId, x, y);
    this.selectedComponentIds = componentId ? [componentId] : [];
    return componentId;
  }

  public selectLayers(componentId: string, layerIds: readonly string[]): void {
    const component = this.project.components.find((candidate) => candidate.id === componentId);
    if (!component) {
      throw new RangeError(`Unknown component "${componentId}"`);
    }
    const knownIds = new Set(component.layers.map((layer) => layer.id));
    const uniqueIds = [...new Set(layerIds)];
    if (uniqueIds.some((id) => !knownIds.has(id))) {
      throw new RangeError("Layer selection contains an unknown layer");
    }
    this.selectedLayerIds = uniqueIds;
    this.selectedComponentIds = uniqueIds.length > 0 ? [componentId] : this.selectedComponentIds;
  }

  public updateComponent(componentId: string, patch: ComponentPatch): void {
    const previous = this.project;
    const next = replaceComponent(previous, componentId, (component) => ({
      ...component,
      name: patch.name ?? component.name,
      functionKey: patch.functionKey ?? component.functionKey,
      bounds: patch.bounds ? mergeBounds(component.bounds, patch.bounds) : component.bounds
    }));

    this.project = next;
    this.undoStack.push(previous);
    this.redoStack.length = 0;
  }

  public updateLayer(componentId: string, layerId: string, patch: LayerPatch): void {
    const previous = this.project;
    const next = replaceLayer(previous, componentId, layerId, (layer) => ({
      ...layer,
      name: patch.name ?? layer.name,
      order: patch.order ?? layer.order,
      visible: patch.visible ?? layer.visible,
      opacity: patch.opacity ?? layer.opacity,
      ...(patch.assetId === undefined ? {} : { assetId: patch.assetId })
    }));
    this.project = next;
    this.undoStack.push(previous);
    this.redoStack.length = 0;
  }

  public undo(): boolean {
    const previous = this.undoStack.pop();
    if (!previous) {
      return false;
    }
    this.redoStack.push(this.project);
    this.project = previous;
    this.selectedComponentIds = this.selectedComponentIds.filter((id) =>
      this.project.components.some((component) => component.id === id)
    );
    this.selectedLayerIds = this.selectedLayerIds.filter((id) =>
      this.project.components.some((component) => component.layers.some((layer) => layer.id === id))
    );
    return true;
  }

  public redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) {
      return false;
    }
    this.undoStack.push(this.project);
    this.project = next;
    this.selectedLayerIds = this.selectedLayerIds.filter((id) =>
      this.project.components.some((component) => component.layers.some((layer) => layer.id === id))
    );
    return true;
  }
}
