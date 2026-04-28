import { computed, onScopeDispose, ref } from "vue";

function normalizeWebcamError(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
      return "Camera permission denied";
    case "NotFoundError":
      return "No camera detected";
    case "NotReadableError":
      return "Camera is already in use";
    default:
      return "Camera unavailable";
  }
}

export function useWebcam() {
  const stream = ref<MediaStream | null>(null);
  const errorMessage = ref<string | null>(null);
  const isActive = computed(() => stream.value !== null);

  async function start() {
    if (stream.value) {
      return stream.value;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      errorMessage.value = "Camera unavailable";
      return null;
    }

    errorMessage.value = null;

    try {
      stream.value = await navigator.mediaDevices.getUserMedia({ video: true });
      return stream.value;
    } catch (error) {
      errorMessage.value = normalizeWebcamError(error);
      stream.value = null;
      return null;
    }
  }

  function stop() {
    if (stream.value) {
      for (const track of stream.value.getTracks()) {
        track.stop();
      }
    }

    stream.value = null;
  }

  onScopeDispose(() => {
    stop();
  });

  return {
    stream,
    isActive,
    errorMessage,
    start,
    stop
  };
}
