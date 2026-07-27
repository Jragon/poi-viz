const TAU = Math.PI * 2;

export type LaunchClassification = "pendulum" | "slack" | "taut-loop";

export function normalizedLaunchEnergy(bottomSpeed: number, gravity: number, length: number): number {
  return (0.5 * bottomSpeed * bottomSpeed) / (gravity * length);
}

export function normalizedBottomSpeed(launchEnergy: number, gravity: number, length: number): number {
  return Math.sqrt(Math.max(0, 2 * launchEnergy * gravity * length));
}

export function launchReleaseAngleSquaredSpeed(bottomSpeed: number, gravity: number, length: number): number | null {
  const uSquared = (bottomSpeed * bottomSpeed) / (gravity * length);
  if (uSquared <= 2 + 1e-9 || uSquared >= 5 - 1e-9) return null;
  return Math.acos((2 - uSquared) / 3);
}

export function classifyLaunchEnergy(launchEnergy: number): LaunchClassification {
  if (launchEnergy < 1) return "pendulum";
  if (launchEnergy < 2.5) return "slack";
  return "taut-loop";
}

export function tautLoopSpeed(theta: number, gravity: number, length: number): number {
  return Math.sqrt(Math.max(0, gravity * length * (3 + 2 * Math.cos(theta))));
}

export function tautLoopTension(theta: number, mass: number, gravity: number): number {
  return 3 * mass * gravity * (1 + Math.cos(theta));
}

export function limitingTautLoopDuration(gravity: number, length: number): number {
  return 4.037811639956846 * Math.sqrt(length / gravity);
}

export function constantThresholdCircleDuration(gravity: number, length: number): number {
  return TAU * Math.sqrt(length / gravity);
}
