import type { PositionsByHand, Vector2 } from "@/engine/types";
import type { TrailSeries } from "@/render/types";

function rotateVector(point: Vector2, radians: number): Vector2 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine
  };
}

export function rotatePositions(positions: PositionsByHand, radians: number): PositionsByHand {
  return {
    L: {
      hand: rotateVector(positions.L.hand, radians),
      head: rotateVector(positions.L.head, radians),
      tether: rotateVector(positions.L.tether, radians)
    },
    R: {
      hand: rotateVector(positions.R.hand, radians),
      head: rotateVector(positions.R.head, radians),
      tether: rotateVector(positions.R.tether, radians)
    }
  };
}

export function rotateTrailSeries(trails: TrailSeries, radians: number): TrailSeries {
  return {
    L: trails.L.map((point) => ({
      tBeats: point.tBeats,
      point: rotateVector(point.point, radians)
    })),
    R: trails.R.map((point) => ({
      tBeats: point.tBeats,
      point: rotateVector(point.point, radians)
    }))
  };
}
