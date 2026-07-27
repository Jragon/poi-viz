export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const ZERO: Vec2 = { x: 0, y: 0 };

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector: Vec2, amount: number): Vec2 {
  return { x: vector.x * amount, y: vector.y * amount };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function lengthSquared(vector: Vec2): number {
  return dot(vector, vector);
}

export function length(vector: Vec2): number {
  return Math.sqrt(lengthSquared(vector));
}

export function normalize(vector: Vec2, fallback: Vec2 = { x: 0, y: -1 }): Vec2 {
  const magnitude = length(vector);
  if (magnitude <= 1e-12) return fallback;
  return scale(vector, 1 / magnitude);
}

export function lerp(a: Vec2, b: Vec2, amount: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount
  };
}
