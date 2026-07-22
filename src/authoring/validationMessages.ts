import type { AuthoredDocumentValidationError } from "@/authoring/types";

const ERROR_MESSAGES: Partial<Record<AuthoredDocumentValidationError["code"], string>> = {
  PENDULUM_HEAD_CENTER_NOT_DOWN:
    "the head pendulum must be centred straight down; its start phase must equal -90° + amplitude × sin(swing phase)",
  PENDULUM_UNSUPPORTED_PLANE: "pendulums are only supported on wall and wheel planes",
  INVALID_PENDULUM_AMPLITUDE: "pendulum amplitude must be greater than 0° and at most 90°",
  INVALID_PENDULUM_CYCLES: "pendulum cycles per unit must be greater than zero",
  INVALID_PENDULUM_SWING_PHASE: "pendulum swing phase must be a finite number"
};

function formatErrorLocation(error: AuthoredDocumentValidationError): string {
  return [
    error.trackId ? `${error.trackId} track` : null,
    error.segmentIndex === undefined ? null : `segment ${error.segmentIndex + 1}`,
    error.node ?? null
  ]
    .filter((part): part is string => part !== null)
    .join(" / ");
}

export function formatAuthoredDocumentErrors(
  errors: readonly AuthoredDocumentValidationError[]
): string | null {
  if (errors.length === 0) return null;

  return errors
    .map((error) => {
      const location = formatErrorLocation(error);
      const message = ERROR_MESSAGES[error.code] ?? error.code;
      return location ? `${location}: ${message}` : message;
    })
    .join(", ");
}
