import type { ProjectManifest } from "@papersketch/project-schema";

export interface EngineClock {
  readonly now: () => number;
}

export interface Renderer {
  render(project: ProjectManifest): void;
}

export interface EngineHost {
  readonly project: ProjectManifest;
  readonly renderer: Renderer;
  start(): void;
  stop(): void;
}

