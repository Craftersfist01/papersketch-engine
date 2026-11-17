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
