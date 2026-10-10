import { TrainPhysicsState, WeatherType } from '../types/game';
import { getCurrentGradient, getCurrentCurvature } from './trackData';

// Arcade-tuned train physics: lighter responsive mass, punchy acceleration, snappy brakes
export const TRAIN_TOTAL_MASS_KG = 160000; // 160 metric tonnes (snappy arcade inertia)
export const LOCO_ADHESION_WEIGHT_KG = 110000; // Driving axle weight
export const MAX_TRACTIVE_FORCE_N = 480000; // 480 kN strong tractive effort
export const MAX_ENGINE_POWER_WATTS = 6200000; // 6.2 MW powerful drive
export const MAX_BRAKING_FORCE_N = 680000; // 680 kN decisive arcade braking effort
export const GRAVITY_MS2 = 9.81;

/**
 * Weather adhesion friction coefficient
 */
export function getWeatherAdhesion(weather: WeatherType): number {
  switch (weather) {
    case 'clear':
      return 0.35;
    case 'sunset':
      return 0.34;
    case 'fog':
      return 0.28;
    case 'rain':
      return 0.22; // Wet rail
    case 'snow':
      return 0.18; // Icy/snowy rail
    default:
      return 0.35;
  }
}

/**
 * Advance train physics by delta seconds (dt) - Arcade responsiveness
 */
export function updateTrainPhysics(
  prev: TrainPhysicsState,
  dt: number,
  weather: WeatherType
): TrainPhysicsState {
  // 1. Snappy Engine RPM response (arcade throttle pickup within 0.35s)
  const targetThrottle = prev.throttlePercent;
  const actualThrottle =
    prev.actualThrottle + (targetThrottle - prev.actualThrottle) * Math.min(1, dt * 4.5);

  // 2. Fast Air Brake Pipe Propagation (immediate response to brake lever)
  let targetBP = 5.0 - (prev.brakePercent / 100) * 1.6;
  if (prev.emergencyBrakeActive) {
    targetBP = 0.0;
  }
  const bpSpeed = prev.emergencyBrakeActive ? 12.0 : 6.0;
  const newBP =
    prev.brakePipePressureBar + (targetBP - prev.brakePipePressureBar) * Math.min(1, dt * bpSpeed);

  // Brake cylinder pressure rises rapidly as BP pressure falls
  const targetBC = Math.max(0, (5.0 - newBP) * 0.76);
  const newBC =
    prev.brakeCylinderPressureBar + (targetBC - prev.brakeCylinderPressureBar) * Math.min(1, dt * 6.0);

  // 3. Track gradient and curvature at current position
  const slopePercent = getCurrentGradient(prev.distanceMeters);
  const currentCurvature = getCurrentCurvature(prev.distanceMeters);

  // 4. Tractive Force calculation (snappy acceleration curve)
  const speedAbs = Math.abs(prev.speedMs);
  const speedKmh = speedAbs * 3.6;

  let availableTractiveForce = 0;
  if (prev.reverser !== 0 && actualThrottle > 0) {
    if (speedAbs < 5.0) {
      // Strong starting punch
      availableTractiveForce = (actualThrottle / 100) * MAX_TRACTIVE_FORCE_N;
    } else {
      // High-speed acceleration regime
      const effectivePower = (actualThrottle / 100) * MAX_ENGINE_POWER_WATTS;
      availableTractiveForce = Math.min(MAX_TRACTIVE_FORCE_N, effectivePower / Math.max(2.0, speedAbs));
    }
  }

  // Wheel slip check on wet/snow rails
  const adhesionMu = getWeatherAdhesion(weather);
  const maxAdhesionForce = LOCO_ADHESION_WEIGHT_KG * GRAVITY_MS2 * adhesionMu;
  let wheelSlip = false;
  if (availableTractiveForce > maxAdhesionForce && speedAbs < 8) {
    wheelSlip = true;
    availableTractiveForce = maxAdhesionForce * 0.75;
  }

  const tractiveForceKn = (availableTractiveForce * prev.reverser) / 1000;

  // 5. Decisive Braking Force calculation (stops from 80 km/h in ~80m, emergency in ~45m)
  const brakeRatio = newBC / 3.8; // 0 to 1
  const brakingForceN = brakeRatio * MAX_BRAKING_FORCE_N * (0.85 + 0.15 * adhesionMu);
  const brakingForceKn = brakingForceN / 1000;

  // 6. Natural Retarding Forces
  const dragA = 2200;
  const dragB = 90 * speedAbs;
  const dragC = 3.5 * speedAbs * speedAbs;
  const totalDragN = dragA + dragB + dragC;

  // Slope force
  const slopeAngleRad = Math.atan(slopePercent / 100);
  const gravitySlopeForceN = TRAIN_TOTAL_MASS_KG * GRAVITY_MS2 * Math.sin(slopeAngleRad);

  // Curve resistance
  const curveResistanceN = TRAIN_TOTAL_MASS_KG * GRAVITY_MS2 * 0.0004 * Math.abs(currentCurvature);

  // 7. Net Force & Acceleration
  let netForceN = availableTractiveForce * prev.reverser;
  netForceN -= gravitySlopeForceN * 0.6; // Slightly reduced slope penalty for arcade play

  if (speedAbs > 0.05) {
    const motionSign = Math.sign(prev.speedMs);
    netForceN -= (totalDragN + curveResistanceN) * motionSign;
    netForceN -= brakingForceN * motionSign;
  } else {
    // Hold stopped train securely if brakes are applied
    if (brakingForceN > Math.abs(netForceN) || (actualThrottle === 0 && prev.brakePercent > 10)) {
      netForceN = 0;
    }
  }

  // Acceleration a = F / m
  const accelerationMs2 = netForceN / TRAIN_TOTAL_MASS_KG;

  // 8. Integrate Speed and Distance
  let newSpeedMs = prev.speedMs + accelerationMs2 * dt;

  // Zero-clamp when braking to halt to prevent overshoot jitter
  if (speedAbs < 0.25 && (brakingForceN > 40000 || actualThrottle === 0)) {
    newSpeedMs = 0;
  }

  // Direction clamp
  if (prev.reverser === 1 && prev.speedMs >= 0 && newSpeedMs < 0 && Math.abs(newSpeedMs) < 0.3) {
    newSpeedMs = 0;
  }

  const newSpeedKmh = newSpeedMs * 3.6;
  const newDistanceMeters = Math.max(0, prev.distanceMeters + newSpeedMs * dt);

  return {
    distanceMeters: newDistanceMeters,
    speedKmh: newSpeedKmh,
    speedMs: newSpeedMs,
    accelerationMs2,
    throttlePercent: prev.throttlePercent,
    actualThrottle,
    brakePercent: prev.brakePercent,
    brakePipePressureBar: newBP,
    brakeCylinderPressureBar: newBC,
    reverser: prev.reverser,
    tractiveForceKn,
    brakingForceKn,
    slopePercent,
    currentCurvature,
    wheelSlip,
    emergencyBrakeActive: prev.emergencyBrakeActive,
  };
}

/**
 * Estimate stopping distance from current speed under full service brake (arcade tuned)
 */
export function estimateStoppingDistanceMeters(speedKmh: number, slopePercent: number): number {
  if (speedKmh <= 0.5) return 0;
  const v = speedKmh / 3.6;
  const avgBrakeDecel = (MAX_BRAKING_FORCE_N * 0.8) / TRAIN_TOTAL_MASS_KG;
  const effectiveDecel = Math.max(1.8, avgBrakeDecel);
  return (v * v) / (2 * effectiveDecel) + v * 0.4;
}
