import * as THREE from "three";

export interface SceneEffectController<TInput> {
  // Provision any scene objects needed for future sync calls.
  // Callers may invoke this eagerly, but sync must still be able to create missing objects.
  create(scene: THREE.Scene, input: TInput): void;
  // Apply the current runtime state for the effect. This is the authoritative update entry point.
  sync(scene: THREE.Scene, input: TInput): void;
  // Dispose all scene objects and GPU resources owned by the effect.
  dispose(scene: THREE.Scene): void;
}
