import type {
  ComponentInstance,
  EngineHost,
  Renderer,
  SceneInstance
} from "@papersketch/engine-core";
import { parseProjectManifest, type ComponentDefinition, type ProjectManifest } from "@papersketch/project-schema";

function createScene(
  project: ProjectManifest,
  sceneId: string
): SceneInstance {
  const definition = project.scenes.find((scene) => scene.id === sceneId);
  if (!definition) {
    throw new RangeError(`Unknown scene "${sceneId}"`);
  }

  const componentsById = new Map(project.components.map((component) => [component.id, component]));
  const components: ComponentInstance[] = definition.rootComponentIds.map((componentId) => {
    const componentDefinition = componentsById.get(componentId);
    if (!componentDefinition) {
      throw new RangeError(`Scene "${sceneId}" references unknown component "${componentId}"`);
    }

    return createComponentInstance(componentDefinition);
  });

  return { id: definition.id, definition, components };
}

function createComponentInstance(definition: ComponentDefinition): ComponentInstance {
  return {
    id: definition.id,
    definition,
    state: "normal"
  };
}

export function createRuntime(project: ProjectManifest, renderer: Renderer): EngineHost {
  const validatedProject = parseProjectManifest(project);
  let running = false;
  let elapsedMs = 0;
  let activeScene: SceneInstance | undefined;

  const render = (deltaMs: number) => {
    renderer.render({
      projectId: validatedProject.id,
      sceneId: activeScene?.id,
      components: activeScene?.components ?? [],
      deltaMs,
      elapsedMs
    });
  };

  return {
    project: validatedProject,
    renderer,
    get activeSceneId() {
      return activeScene?.id;
    },
    start() {
      if (running) {
        return;
      }

      running = true;
      if (!activeScene && validatedProject.scenes[0]) {
        activeScene = createScene(validatedProject, validatedProject.scenes[0].id);
      }
      render(0);
    },
    stop() {
      running = false;
    },
    tick(deltaMs: number) {
      if (!running) {
        return;
      }
      if (!Number.isFinite(deltaMs) || deltaMs < 0) {
        throw new RangeError("deltaMs must be a non-negative finite number");
      }

      elapsedMs += deltaMs;
      render(deltaMs);
    },
    loadScene(sceneId: string) {
      activeScene = createScene(validatedProject, sceneId);
      if (running) {
        render(0);
      }
    },
    getActiveScene() {
      return activeScene;
    }
  };
}

