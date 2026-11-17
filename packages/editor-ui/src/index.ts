import type { EditorState } from "@papersketch/editor";

export interface PropertyField {
  readonly key: "name" | "functionKey" | "x" | "y" | "width" | "height" | "rotation";
  readonly label: string;
  readonly value: string | number;
}

export interface PropertyPanelModel {
  readonly selectedComponentId?: string;
  readonly fields: readonly PropertyField[];
}

export interface LayerTreeItem {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly visible: boolean;
  readonly opacity: number;
  readonly selected: boolean;
}

export interface LayerTreeModel {
  readonly componentId?: string;
  readonly items: readonly LayerTreeItem[];
}

export interface EditorPreviewComponent {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly selected: boolean;
}

export interface EditorPreviewModel {
  readonly sceneId: string;
  readonly components: readonly EditorPreviewComponent[];
}

export function createPropertyPanelModel(state: EditorState): PropertyPanelModel {
  if (state.selectedComponentIds.length !== 1) {
    return { fields: [] };
  }

  const selectedId = state.selectedComponentIds[0];
  const component = state.project.components.find((candidate) => candidate.id === selectedId);
  if (!component) {
    return { fields: [] };
  }

  return {
    selectedComponentId: component.id,
    fields: [
      { key: "name", label: "Name", value: component.name },
      { key: "functionKey", label: "Function", value: component.functionKey },
      { key: "x", label: "X", value: component.bounds.x },
      { key: "y", label: "Y", value: component.bounds.y },
      { key: "width", label: "Width", value: component.bounds.width },
      { key: "height", label: "Height", value: component.bounds.height },
      { key: "rotation", label: "Rotation", value: component.bounds.rotation }
    ]
  };
}

export function createLayerTreeModel(
  state: EditorState,
  componentId = state.selectedComponentIds[0]
): LayerTreeModel {
  const component = componentId
    ? state.project.components.find((candidate) => candidate.id === componentId)
    : undefined;
  if (!component) {
    return { items: [] };
  }
  return {
    componentId: component.id,
    items: [...component.layers]
      .sort((a, b) => a.order - b.order)
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        order: layer.order,
        visible: layer.visible,
        opacity: layer.opacity,
        selected: state.selectedLayerIds.includes(layer.id)
      }))
  };
}

export function createEditorPreviewModel(
  state: EditorState,
  sceneId: string
): EditorPreviewModel {
  const scene = state.project.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    throw new RangeError(`Unknown scene "${sceneId}"`);
  }
  const componentsById = new Map(state.project.components.map((component) => [component.id, component]));
  return {
    sceneId,
    components: scene.rootComponentIds.flatMap((id) => {
      const component = componentsById.get(id);
      if (!component) {
        return [];
      }
      return [{
        id: component.id,
        name: component.name,
        ...component.bounds,
        selected: state.selectedComponentIds.includes(component.id)
      }];
    })
  };
}
