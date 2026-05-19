export interface RecoverableSceneEffectController<TScene, TInput> {
  sync(scene: TScene, input: TInput): void;
  dispose(scene: TScene): void;
}

interface SyncRecoverableFirePoiEffectOptions<
  TScene,
  TInput,
  TController extends RecoverableSceneEffectController<TScene, TInput>
> {
  readonly scene: TScene | null;
  readonly controller: TController | null;
  readonly createController: () => TController;
  readonly input: TInput;
  readonly renderScene: () => void;
}

export function syncRecoverableFirePoiEffect<
  TScene,
  TInput,
  TController extends RecoverableSceneEffectController<TScene, TInput>
>({
  scene,
  controller,
  createController,
  input,
  renderScene
}: SyncRecoverableFirePoiEffectOptions<TScene, TInput, TController>): TController | null {
  if (!scene) {
    return controller;
  }

  let nextController = controller;

  try {
    nextController ??= createController();
    nextController.sync(scene, input);
    renderScene();
    return nextController;
  } catch {
    nextController?.dispose(scene);
    renderScene();
    return null;
  }
}