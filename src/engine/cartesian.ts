import { AngleRad, CartesianRigPose, Radius, RelativeRigPose, Vec2 } from "@/engine/types";

function polarToCartesian(radius: Radius, angleRad: AngleRad): Vec2 {
  return {
    x: radius * Math.cos(angleRad),
    y: radius * Math.sin(angleRad)
  };
}

function addCartesian(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function toCartesianRigPose(relative: RelativeRigPose): CartesianRigPose {
  // assuming that the body is the origin for the hand and at 0, 0
  const handPosition: Vec2 = polarToCartesian(relative.handPose.radius, relative.handPose.phaseAbs);
  const headPosition: Vec2 = addCartesian(
    handPosition,
    polarToCartesian(relative.headPose.radius, relative.headPose.phaseAbs)
  );

  return {
    handPosition,
    headPosition
  };
}
