import type { EngineHost, Renderer } from "@papersketch/engine-core";
import type { ProjectManifest } from "@papersketch/project-schema";

export function createRuntime(project: ProjectManifest, renderer: Renderer): EngineHost {
  let running = false;

  return {
    project,
    renderer,
    start() {
      if (running) {
        return;
      }

      running = true;
      renderer.render(project);
    },
    stop() {
      running = false;
    }
  };
}

