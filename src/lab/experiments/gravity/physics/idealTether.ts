import type {
  HandKinematics,
  HandPath,
  IdealTetherConfig,
  IdealTetherEvent,
  IdealTetherMetrics,
  IdealTetherSample,
  IdealTetherTrace,
  SimulationResult
} from "./types";
import {
  add,
  cross,
  dot,
  length,
  lerp,
  normalize,
  scale,
  sub,
  type Vec2,
  ZERO
} from "./vector2";

const EPSILON = 1e-10;
const EVENT_ITERATIONS = 24;
const MAX_STEPS = 200_000;
const TAU = Math.PI * 2;

interface TautState {
  readonly mode: "taut";
  readonly theta: number;
  readonly omega: number;
}

interface SlackState {
  readonly mode: "slack";
  readonly position: Vec2;
  readonly velocity: Vec2;
}

type InternalState = TautState | SlackState;

interface AngularState {
  readonly theta: number;
  readonly omega: number;
}

interface WorkState {
  handPositive: number;
  handNegative: number;
  drivePositive: number;
  driveNegative: number;
}

export const FIXED_HAND_PATH: HandPath = {
  sample: () => ({ position: ZERO, velocity: ZERO, acceleration: ZERO })
};

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateConfig(config: IdealTetherConfig): string | null {
  if (!finitePositive(config.length)) return "Tether length must be a positive finite number.";
  if (!finitePositive(config.mass)) return "Poi mass must be a positive finite number.";
  if (!finitePositive(config.gravity)) return "Gravity must be a positive finite number.";
  if (!finitePositive(config.timestep)) return "Timestep must be a positive finite number.";
  if (!finitePositive(config.duration)) return "Duration must be a positive finite number.";
  if (!Number.isFinite(config.initialTheta) || !Number.isFinite(config.initialAngularVelocity)) {
    return "Initial angle and angular velocity must be finite numbers.";
  }
  if (!Number.isFinite(config.catchRestitution) || config.catchRestitution < 0 || config.catchRestitution > 1) {
    return "Catch restitution must be between 0 and 1.";
  }
  if (Math.ceil(config.duration / config.timestep) > MAX_STEPS) {
    return `Simulation is too long for its timestep; the maximum is ${MAX_STEPS.toLocaleString()} steps.`;
  }
  return null;
}

function handAt(config: IdealTetherConfig, time: number): HandKinematics {
  return (config.handPath ?? FIXED_HAND_PATH).sample(time);
}

function radialBasis(theta: number): { readonly er: Vec2; readonly et: Vec2 } {
  return {
    er: { x: Math.sin(theta), y: -Math.cos(theta) },
    et: { x: Math.cos(theta), y: Math.sin(theta) }
  };
}

function worldFromTaut(
  config: IdealTetherConfig,
  state: TautState,
  time: number
): { readonly hand: HandKinematics; readonly position: Vec2; readonly velocity: Vec2 } {
  const hand = handAt(config, time);
  const { er, et } = radialBasis(state.theta);
  return {
    hand,
    position: add(hand.position, scale(er, config.length)),
    velocity: add(hand.velocity, scale(et, config.length * state.omega))
  };
}

function tensionFor(config: IdealTetherConfig, state: TautState, time: number): number {
  const { er } = radialBasis(state.theta);
  const hand = handAt(config, time);
  return config.mass *
    (config.length * state.omega * state.omega +
      config.gravity * Math.cos(state.theta) -
      dot(hand.acceleration, er));
}

function angularAcceleration(
  config: IdealTetherConfig,
  time: number,
  state: AngularState
): number {
  const { et } = radialBasis(state.theta);
  const hand = handAt(config, time);
  const driveTorque = config.driveTorque?.(time, state.theta, state.omega) ?? 0;
  return (
    -config.gravity * Math.sin(state.theta) -
    dot(hand.acceleration, et) +
    driveTorque / (config.mass * config.length)
  ) / config.length;
}

function addAngular(a: AngularState, b: AngularState, amount: number): AngularState {
  return { theta: a.theta + b.theta * amount, omega: a.omega + b.omega * amount };
}

function derivative(config: IdealTetherConfig, time: number, state: AngularState): AngularState {
  return { theta: state.omega, omega: angularAcceleration(config, time, state) };
}

function integrateTaut(
  config: IdealTetherConfig,
  state: TautState,
  time: number,
  duration: number
): TautState {
  const initial: AngularState = { theta: state.theta, omega: state.omega };
  const k1 = derivative(config, time, initial);
  const k2 = derivative(config, time + duration / 2, addAngular(initial, k1, duration / 2));
  const k3 = derivative(config, time + duration / 2, addAngular(initial, k2, duration / 2));
  const k4 = derivative(config, time + duration, addAngular(initial, k3, duration));
  return {
    mode: "taut",
    theta: initial.theta + (duration / 6) * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
    omega: initial.omega + (duration / 6) * (k1.omega + 2 * k2.omega + 2 * k3.omega + k4.omega)
  };
}

function integrateSlack(
  config: IdealTetherConfig,
  state: SlackState,
  time: number,
  duration: number
): SlackState {
  const gravityAcceleration: Vec2 = { x: 0, y: -config.gravity };
  return {
    mode: "slack",
    position: add(add(state.position, scale(state.velocity, duration)), scale(gravityAcceleration, 0.5 * duration * duration)),
    velocity: add(state.velocity, scale(gravityAcceleration, duration))
  };
}

function gapAt(config: IdealTetherConfig, state: SlackState, time: number, duration: number): number {
  const predicted = integrateSlack(config, state, time, duration);
  return length(sub(predicted.position, handAt(config, time + duration).position)) - config.length;
}

function releaseState(config: IdealTetherConfig, state: TautState, time: number): SlackState {
  const world = worldFromTaut(config, state, time);
  return { mode: "slack", position: world.position, velocity: world.velocity };
}

function catchState(
  config: IdealTetherConfig,
  state: SlackState,
  time: number,
  duration: number
): TautState {
  const world = integrateSlack(config, state, time, duration);
  const hand = handAt(config, time + duration);
  const relative = sub(world.position, hand.position);
  const er = normalize(relative, { x: 0, y: -1 });
  const relativeVelocity = sub(world.velocity, hand.velocity);
  const outwardSpeed = dot(relativeVelocity, er);
  const correctedVelocity =
    outwardSpeed > 0
      ? sub(world.velocity, scale(er, (1 + config.catchRestitution) * outwardSpeed))
      : world.velocity;
  const correctedRelativeVelocity = sub(correctedVelocity, hand.velocity);
  const theta = Math.atan2(er.x, -er.y);
  const { et } = radialBasis(theta);
  return {
    mode: "taut",
    theta,
    omega: dot(correctedRelativeVelocity, et) / config.length
  };
}

function findReleaseFraction(
  config: IdealTetherConfig,
  state: TautState,
  time: number,
  duration: number
): number {
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < EVENT_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2;
    const candidate = integrateTaut(config, state, time, duration * middle);
    if (tensionFor(config, candidate, time + duration * middle) >= 0) low = middle;
    else high = middle;
  }
  return high;
}

function findCatchFraction(
  config: IdealTetherConfig,
  state: SlackState,
  time: number,
  duration: number
): number {
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < EVENT_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2;
    if (gapAt(config, state, time, duration * middle) < 0) low = middle;
    else high = middle;
  }
  return high;
}

function mechanicalEnergy(config: IdealTetherConfig, position: Vec2, velocity: Vec2): number {
  return 0.5 * config.mass * (velocity.x * velocity.x + velocity.y * velocity.y) +
    config.mass * config.gravity * (position.y + config.length);
}

function sampleState(
  config: IdealTetherConfig,
  state: InternalState,
  time: number,
  work: Readonly<WorkState>
): IdealTetherSample {
  const hand = handAt(config, time);
  let position: Vec2;
  let velocity: Vec2;
  let theta: number;
  let angularVelocity: number;
  let tension = 0;
  let gravityPower = 0;
  let handPower = 0;
  let drivePower = 0;
  let radialHandVelocity = 0;
  let tangentialHandAcceleration = 0;
  let radialHandAcceleration = 0;

  if (state.mode === "taut") {
    const world = worldFromTaut(config, state, time);
    position = world.position;
    velocity = world.velocity;
    theta = state.theta;
    angularVelocity = state.omega;
    tension = tensionFor(config, state, time);
    const { er, et } = radialBasis(state.theta);
    radialHandVelocity = dot(hand.velocity, er);
    tangentialHandAcceleration = dot(hand.acceleration, et);
    radialHandAcceleration = dot(hand.acceleration, er);
    handPower = -tension * radialHandVelocity;
    drivePower = (config.driveTorque?.(time, state.theta, state.omega) ?? 0) * state.omega;
  } else {
    position = state.position;
    velocity = state.velocity;
    const relative = sub(position, hand.position);
    const relativeVelocity = sub(velocity, hand.velocity);
    const radiusSquared = Math.max(length(relative) ** 2, EPSILON);
    theta = Math.atan2(relative.x, -relative.y);
    angularVelocity = cross(relative, relativeVelocity) / radiusSquared;
    const er = normalize(relative, { x: 0, y: -1 });
    const et = { x: -er.y, y: er.x };
    radialHandVelocity = dot(hand.velocity, er);
    tangentialHandAcceleration = dot(hand.acceleration, et);
    radialHandAcceleration = dot(hand.acceleration, er);
  }

  const relativeRadius = length(sub(position, hand.position));
  const relativeSpeed = length(sub(velocity, hand.velocity));
  const worldSpeed = length(velocity);
  const velocityScale = Math.sqrt(config.gravity * config.length);
  gravityPower = -config.mass * config.gravity * velocity.y;
  const powerScale = config.mass * config.gravity * velocityScale;
  const energy = mechanicalEnergy(config, position, velocity);
  return {
    time,
    mode: state.mode,
    handPosition: hand.position,
    handVelocity: hand.velocity,
    poiPosition: position,
    poiVelocity: velocity,
    relativeRadius,
    radiusRatio: relativeRadius / config.length,
    theta,
    angularVelocity,
    relativeSpeed,
    normalizedRelativeSpeed: relativeSpeed / velocityScale,
    worldSpeed,
    normalizedWorldSpeed: worldSpeed / velocityScale,
    tension,
    normalizedTension: tension / (config.mass * config.gravity),
    mechanicalEnergy: energy,
    normalizedEnergy: energy / (config.mass * config.gravity * config.length),
    gravityPower,
    normalizedGravityPower: gravityPower / powerScale,
    handPower,
    normalizedHandPower: handPower / powerScale,
    drivePower,
    normalizedDrivePower: drivePower / powerScale,
    radialHandVelocity,
    normalizedRadialHandVelocity: radialHandVelocity / velocityScale,
    tangentialHandAcceleration,
    normalizedTangentialHandAcceleration: tangentialHandAcceleration / config.gravity,
    radialHandAcceleration,
    normalizedRadialHandAcceleration: radialHandAcceleration / config.gravity,
    cumulativeHandPositiveWork: work.handPositive,
    cumulativeHandNegativeWork: work.handNegative,
    cumulativeDrivePositiveWork: work.drivePositive,
    cumulativeDriveNegativeWork: work.driveNegative
  };
}

function unwrapAngle(samples: readonly IdealTetherSample[]): number {
  if (samples.length === 0) return 0;
  let previous = samples[0]!.theta;
  let total = 0;
  for (const sample of samples.slice(1)) {
    let delta = sample.theta - previous;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    total += delta;
    previous = sample.theta;
  }
  return total;
}

function classifyTrace(samples: readonly IdealTetherSample[], events: readonly IdealTetherEvent[]): IdealTetherMetrics["classification"] {
  if (samples.length < 2) return "invalid";
  const unwrappedAngle = unwrapAngle(samples);
  const hasMotion = samples.some((sample) => Math.abs(sample.angularVelocity) > 1e-6);
  if (!hasMotion) return "rest";
  if (Math.abs(unwrappedAngle) >= TAU - 0.08) {
    return events.some((event) => event.kind === "release") ? "slack-loop" : "taut-loop";
  }
  return events.some((event) => event.kind === "release") ? "slack-and-catch" : "pendulum";
}

function advanceStep(
  config: IdealTetherConfig,
  initial: InternalState,
  time: number,
  duration: number,
  events: IdealTetherEvent[]
): InternalState {
  let state = initial;
  let localTime = time;
  let remaining = duration;

  for (let transition = 0; transition < 4 && remaining > EPSILON; transition += 1) {
    if (state.mode === "taut") {
      const candidate = integrateTaut(config, state, localTime, remaining);
      const endTension = tensionFor(config, candidate, localTime + remaining);
      if (endTension >= -EPSILON) return candidate;

      const fraction = findReleaseFraction(config, state, localTime, remaining);
      const eventDuration = remaining * fraction;
      const released = integrateTaut(config, state, localTime, eventDuration);
      const releasedWorld = worldFromTaut(config, released, localTime + eventDuration);
      const energy = mechanicalEnergy(config, releasedWorld.position, releasedWorld.velocity);
      events.push({
        kind: "release",
        time: localTime + eventDuration,
        theta: released.theta,
        energyBefore: energy,
        energyAfter: energy,
        boundaryWork: 0,
        dissipatedEnergy: 0
      });
      state = releaseState(config, released, localTime + eventDuration);
      localTime += eventDuration;
      remaining -= eventDuration;
      continue;
    }

    const candidate = integrateSlack(config, state, localTime, remaining);
    const startGap = length(sub(state.position, handAt(config, localTime).position)) - config.length;
    const endGap = length(sub(candidate.position, handAt(config, localTime + remaining).position)) - config.length;
    if (!(endGap >= 0 && startGap <= 1e-7)) return candidate;

    const fraction = findCatchFraction(config, state, localTime, remaining);
    const eventDuration = remaining * fraction;
    const before = integrateSlack(config, state, localTime, eventDuration);
    const catchTime = localTime + eventDuration;
    const catchHand = handAt(config, catchTime);
    const catchRelative = sub(before.position, catchHand.position);
    const catchEr = normalize(catchRelative, { x: 0, y: -1 });
    const catchRelativeVelocity = sub(before.velocity, catchHand.velocity);
    const catchOutwardSpeed = dot(catchRelativeVelocity, catchEr);
    const beforeEnergy = mechanicalEnergy(config, before.position, before.velocity);
    state = catchState(config, state, localTime, eventDuration);
    const afterWorld = worldFromTaut(config, state, catchTime);
    const afterEnergy = mechanicalEnergy(config, afterWorld.position, afterWorld.velocity);
    const dissipatedEnergy = 0.5 * config.mass * (1 - config.catchRestitution ** 2) * catchOutwardSpeed ** 2;
    events.push({
      kind: "catch",
      time: catchTime,
      theta: state.theta,
      energyBefore: beforeEnergy,
      energyAfter: afterEnergy,
      boundaryWork: afterEnergy - beforeEnergy + dissipatedEnergy,
      dissipatedEnergy
    });
    localTime += eventDuration;
    remaining -= eventDuration;
  }

  return state;
}

function buildMetrics(
  samples: readonly IdealTetherSample[],
  events: readonly IdealTetherEvent[]
): IdealTetherMetrics {
  const finalSample = samples.at(-1);
  const positiveHandWork = finalSample?.cumulativeHandPositiveWork ?? 0;
  const negativeHandWork = finalSample?.cumulativeHandNegativeWork ?? 0;
  const positiveDriveWork = finalSample?.cumulativeDrivePositiveWork ?? 0;
  const negativeDriveWork = finalSample?.cumulativeDriveNegativeWork ?? 0;
  const energyStart = samples[0]?.mechanicalEnergy ?? 0;
  const energyEnd = samples.at(-1)?.mechanicalEnergy ?? energyStart;
  const maximumUnwrappedAngle = unwrapAngle(samples);
  const catchBoundaryWork = events.reduce((total, event) => total + event.boundaryWork, 0);
  const catchDissipation = events.reduce((total, event) => total + event.dissipatedEnergy, 0);
  const energyBalanceResidual = energyEnd - energyStart -
    (positiveHandWork + negativeHandWork) -
    (positiveDriveWork + negativeDriveWork) -
    catchBoundaryWork +
    catchDissipation;
  return {
    classification: classifyTrace(samples, events),
    firstReleaseTime: events.find((event) => event.kind === "release")?.time ?? null,
    catchCount: events.filter((event) => event.kind === "catch").length,
    minimumTension: samples.reduce((minimum, sample) => Math.min(minimum, sample.normalizedTension), Infinity),
    maximumTension: samples.reduce((maximum, sample) => Math.max(maximum, sample.normalizedTension), 0),
    maximumRelativeSpeed: samples.reduce((maximum, sample) => Math.max(maximum, sample.normalizedRelativeSpeed), 0),
    maximumWorldSpeed: samples.reduce((maximum, sample) => Math.max(maximum, sample.normalizedWorldSpeed), 0),
    maximumRadiusRatio: samples.reduce((maximum, sample) => Math.max(maximum, sample.radiusRatio), 0),
    maximumUnwrappedAngle,
    positiveHandWork,
    negativeHandWork,
    absoluteHandWork: positiveHandWork - negativeHandWork,
    positiveDriveWork,
    negativeDriveWork,
    absoluteDriveWork: positiveDriveWork - negativeDriveWork,
    catchBoundaryWork,
    catchDissipation,
    energyStart,
    energyEnd,
    energyDrift: energyEnd - energyStart,
    energyBalanceResidual
  };
}

export function simulateIdealTether(input: IdealTetherConfig): SimulationResult {
  const validationError = validateConfig(input);
  if (validationError) return { ok: false, error: validationError };

  const config = { ...input, handPath: input.handPath ?? FIXED_HAND_PATH };
  const events: IdealTetherEvent[] = [];
  const work: WorkState = { handPositive: 0, handNegative: 0, drivePositive: 0, driveNegative: 0 };
  let state: InternalState = {
    mode: "taut",
    theta: config.initialTheta,
    omega: config.initialAngularVelocity
  };
  let time = 0;
  let previousSample = sampleState(config, state, time, work);
  const samples: IdealTetherSample[] = [previousSample];
  const stepCount = Math.ceil(config.duration / config.timestep);

  for (let step = 0; step < stepCount; step += 1) {
    const duration = Math.min(config.timestep, config.duration - time);
    if (duration <= EPSILON) break;
    state = advanceStep(config, state, time, duration, events);
    time += duration;
    const rawSample = sampleState(config, state, time, work);
    const averageHandPower = (previousSample.handPower + rawSample.handPower) * 0.5;
    const averageDrivePower = (previousSample.drivePower + rawSample.drivePower) * 0.5;
    if (averageHandPower >= 0) work.handPositive += averageHandPower * duration;
    else work.handNegative += averageHandPower * duration;
    if (averageDrivePower >= 0) work.drivePositive += averageDrivePower * duration;
    else work.driveNegative += averageDrivePower * duration;

    const nextSample: IdealTetherSample = {
      ...rawSample,
      cumulativeHandPositiveWork: work.handPositive,
      cumulativeHandNegativeWork: work.handNegative,
      cumulativeDrivePositiveWork: work.drivePositive,
      cumulativeDriveNegativeWork: work.driveNegative
    };
    samples.push(nextSample);
    previousSample = nextSample;
  }

  const trace: IdealTetherTrace = {
    config,
    samples,
    events,
    metrics: buildMetrics(samples, events)
  };
  return { ok: true, trace };
}

export function createDefaultLaunchConfig(): IdealTetherConfig {
  return {
    length: 1,
    mass: 1,
    gravity: 1,
    timestep: 1 / 480,
    duration: 10,
    initialTheta: 0,
    initialAngularVelocity: Math.sqrt(5),
    catchRestitution: 0
  };
}

export function angleDistance(a: number, b: number): number {
  let delta = a - b;
  while (delta > Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  return Math.abs(delta);
}

export function interpolateSample(
  samples: readonly IdealTetherSample[],
  time: number
): IdealTetherSample {
  if (samples.length === 0) throw new Error("Cannot interpolate an empty trace.");
  if (time <= samples[0]!.time) return samples[0]!;
  const last = samples[samples.length - 1]!;
  if (time >= last.time) return last;
  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (samples[middle]!.time <= time) low = middle;
    else high = middle;
  }
  const a = samples[low]!;
  const b = samples[high]!;
  const amount = (time - a.time) / Math.max(b.time - a.time, EPSILON);
  return {
    ...a,
    time,
    handPosition: lerp(a.handPosition, b.handPosition, amount),
    handVelocity: lerp(a.handVelocity, b.handVelocity, amount),
    poiPosition: lerp(a.poiPosition, b.poiPosition, amount),
    poiVelocity: lerp(a.poiVelocity, b.poiVelocity, amount),
    relativeRadius: a.relativeRadius + (b.relativeRadius - a.relativeRadius) * amount,
    radiusRatio: a.radiusRatio + (b.radiusRatio - a.radiusRatio) * amount,
    theta: a.theta + (b.theta - a.theta) * amount,
    angularVelocity: a.angularVelocity + (b.angularVelocity - a.angularVelocity) * amount,
    relativeSpeed: a.relativeSpeed + (b.relativeSpeed - a.relativeSpeed) * amount,
    normalizedRelativeSpeed: a.normalizedRelativeSpeed + (b.normalizedRelativeSpeed - a.normalizedRelativeSpeed) * amount,
    worldSpeed: a.worldSpeed + (b.worldSpeed - a.worldSpeed) * amount,
    normalizedWorldSpeed: a.normalizedWorldSpeed + (b.normalizedWorldSpeed - a.normalizedWorldSpeed) * amount,
    tension: a.tension + (b.tension - a.tension) * amount,
    normalizedTension: a.normalizedTension + (b.normalizedTension - a.normalizedTension) * amount,
    mechanicalEnergy: a.mechanicalEnergy + (b.mechanicalEnergy - a.mechanicalEnergy) * amount,
    normalizedEnergy: a.normalizedEnergy + (b.normalizedEnergy - a.normalizedEnergy) * amount,
    gravityPower: a.gravityPower + (b.gravityPower - a.gravityPower) * amount,
    normalizedGravityPower: a.normalizedGravityPower +
      (b.normalizedGravityPower - a.normalizedGravityPower) * amount,
    handPower: a.handPower + (b.handPower - a.handPower) * amount,
    normalizedHandPower: a.normalizedHandPower +
      (b.normalizedHandPower - a.normalizedHandPower) * amount,
    drivePower: a.drivePower + (b.drivePower - a.drivePower) * amount,
    normalizedDrivePower: a.normalizedDrivePower +
      (b.normalizedDrivePower - a.normalizedDrivePower) * amount,
    radialHandVelocity: a.radialHandVelocity + (b.radialHandVelocity - a.radialHandVelocity) * amount,
    normalizedRadialHandVelocity: a.normalizedRadialHandVelocity +
      (b.normalizedRadialHandVelocity - a.normalizedRadialHandVelocity) * amount,
    tangentialHandAcceleration: a.tangentialHandAcceleration + (b.tangentialHandAcceleration - a.tangentialHandAcceleration) * amount,
    normalizedTangentialHandAcceleration: a.normalizedTangentialHandAcceleration +
      (b.normalizedTangentialHandAcceleration - a.normalizedTangentialHandAcceleration) * amount,
    radialHandAcceleration: a.radialHandAcceleration + (b.radialHandAcceleration - a.radialHandAcceleration) * amount,
    normalizedRadialHandAcceleration: a.normalizedRadialHandAcceleration +
      (b.normalizedRadialHandAcceleration - a.normalizedRadialHandAcceleration) * amount,
    cumulativeHandPositiveWork: a.cumulativeHandPositiveWork + (b.cumulativeHandPositiveWork - a.cumulativeHandPositiveWork) * amount,
    cumulativeHandNegativeWork: a.cumulativeHandNegativeWork + (b.cumulativeHandNegativeWork - a.cumulativeHandNegativeWork) * amount,
    cumulativeDrivePositiveWork: a.cumulativeDrivePositiveWork + (b.cumulativeDrivePositiveWork - a.cumulativeDrivePositiveWork) * amount,
    cumulativeDriveNegativeWork: a.cumulativeDriveNegativeWork + (b.cumulativeDriveNegativeWork - a.cumulativeDriveNegativeWork) * amount
  };
}
