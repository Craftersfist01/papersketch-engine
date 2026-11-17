import type {
  ComponentDefinition,
  ProjectManifest,
  SceneDefinition
} from "@papersketch/project-schema";

export interface EngineClock {
  readonly now: () => number;
}

export interface Renderer {
  render(frame: RenderFrame): void;
}

export interface ComponentInstance {
  readonly id: string;
  readonly definition: ComponentDefinition;
  readonly state: string;
}

export interface SceneInstance {
  readonly id: string;
  readonly definition: SceneDefinition;
  readonly components: readonly ComponentInstance[];
}

export interface RenderFrame {
  readonly projectId: string;
  readonly sceneId?: string;
  readonly components: readonly ComponentInstance[];
  readonly deltaMs: number;
  readonly elapsedMs: number;
}

export interface EngineHost {
  readonly project: ProjectManifest;
  readonly renderer: Renderer;
  readonly activeSceneId?: string;
  start(): void;
  stop(): void;
  tick(deltaMs: number): void;
  loadScene(sceneId: string): void;
  getActiveScene(): SceneInstance | undefined;
}

