export type LabFigureWidth = "compact" | "prose" | "wide" | "full";

export type LabFigureLayout = "two-up" | "four-strip" | "matrix" | "main-with-inset";

const LAB_FIGURE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export function assertValidLabFigureId(id: string): string {
  if (!LAB_FIGURE_ID_PATTERN.test(id) || id.includes("\n") || id.includes("\r")) {
    throw new Error(
      `Invalid lab figure ID "${id}". Use lower-case kebab-case beginning with a letter.`
    );
  }

  return id;
}
