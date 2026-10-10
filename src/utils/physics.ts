import { TrainPhysicsState, WeatherType } from '../types/game';
import { getCurrentGradient, getCurrentCurvature } from './trackData';

export const TRAIN_TOTAL_MASS_KG = 620000; // 620 metric tonnes (locomotive + 8 passenger cars)
export const LOCO_ADHESION_WEIGHT_KG = 125000; // 125 tonnes locomotive weight on driving axles
export const MAX_TRACTIVE_FORCE_N = 310000; // 310 kN maximum starting tractive effort
export const MAX_ENGINE_POWER_WATTS = 3800000; // 3.8 MW
export const MAX_BRAKING_FORCE_N = 340000; // 340 kN full emergency braking effort
export const GRAVITY_MS2 = 9.81;

/**
 * Weather adhesion friction coefficient
 */
export function getWeatherAdhesion(weather: WeatherType): number {
  switch (weather) {
    case 'clear':
      return 0.28;
    case 'sunset':
      return 0.27;
    case 'fog':
      return 0.22;
    case 'rain':
      return 0.17; // Wet rail
    case 'snow':
      return 0.14; // Icy/snowy rail
    default:
      return 0.28;
  }
}

/**
 * Advance train physics by delta seconds (dt)
 */
export function updateTrainPhysics(
  prev: TrainPhysicsState,
  dt: number,
  weather: WeatherType
): TrainPhysicsState {
  // 1. Engine RPM and prime mover inertia lag
  // Takes ~2.5s for engine governor to spin up or down
  const throttleRate = dt / 2.2;
  const targetThrottle = prev.throttlePercent;
  const actualThrottle = prev.actualThrottle + (targetThrottle - prev.actualThrottle) * Math.min(1, throttleRate * 3.5);

  // 2. Air Brake Pipe Propagation
  // Target B.P. pressure: 5.0 bar (0% brake) down to 3.5 bar (100% service), 0.0 bar (emergency)
  let targetBP = 5.0 - (prev.brakePercent / 100) * 1.6;
  if (prev.emergencyBrakeActive) {
    targetBP = 0.0;
  }
  const bpSpeed = prev.emergencyBrakeActive ? 4.0 : 1.2; // Emergency dumps faster
  const newBP = prev.brakePipePressureBar + (targetBP - prev.brakePipePressureBar) * Math.min(1, dt * bpSpeed);

  // Brake cylinder pressure rises as BP pressure falls
  const targetBC = Math.max(0, (5.0 - newBP) * 0.76);
  const newBC = prev.brakeCylinderPressureBar + (targetBC - prev.brakeCylinderPressureBar) * Math.min(1, dt * 2.0);

  // 3. Track gradient and curvature at current position
  const slopePercent = getCurrentGradient(prev.distanceMeters);
  const currentCurvature = getCurrentCurvature(prev.distanceMeters);

  // 4. Tractive Force calculation
  const speedAbs = Math.abs(prev.speedMs);
  const speedKmh = speedAbs * 3.6;

  let availableTractiveForce = 0;
  if (prev.reverser !== 0 && actualThrottle > 0) {
    // Starting tractive effort vs power curve
    if (speedAbs < 3.0) {
      // Starting effort (constant tractive effort regime)
      availableTractiveForce = (actualThrottle / 100) * MAX_TRACTIVE_FORCE_N;
    } else {
      // Constant power regime: F = P / v
      const effectivePower = (actualThrottle / 100) * MAX_ENGINE_POWER_WATTS;
      availableTractiveForce = Math.min(MAX_TRACTIVE_FORCE_N, effectivePower / speedAbs);
    }
  }

  // Check wheel slip on wet/snow rails
  const adhesionMu = getWeatherAdhesion(weather);
  const maxAdhesionForce = LOCO_ADHESION_WEIGHT_KG * GRAVITY_MS2 * adhesionMu;
  let wheelSlip = false;
  if (availableTractiveForce > maxAdhesionForce) {
    wheelSlip = true;
    availableTractiveForce = maxAdhesionForce * 0.65; // Dynamic friction drop on slip
  }

  const tractiveForceKn = (availableTractiveForce * prev.reverser) / 1000;

  // 5. Braking Force calculation
  const brakeRatio = newBC / 3.8; // 0 to 1
  const brakingForceN = brakeRatio * MAX_BRAKING_FORCE_N * (0.8 + 0.2 * adhesionMu);
  const brakingForceKn = brakingForceN / 1000;

  // 6. Natural Retarding Forces (Davis Drag Equation)
  // F_drag = A + B*v + C*v^2
  const dragA = 4200; // Mechanical journal resistance (N)
  const dragB = 180 * speedAbs; // Flange and momentum resistance
  const dragC = 6.2 * speedAbs * speedAbs; // Aerodynamic drag
  const totalDragN = dragA + dragB + dragC;

  // Gravity slope force: F = M * g * sin(theta)
  // slopePercent = 1.0 means 1m rise per 100m ~ 0.01 rad
  const slopeAngleRad = Math.atan(slopePercent / 100);
  const gravitySlopeForceN = TRAIN_TOTAL_MASS_KG * GRAVITY_MS2 * Math.sin(slopeAngleRad);

  // Curve resistance force
  const curveResistanceN = TRAIN_TOTAL_MASS_KG * GRAVITY_MS2 * 0.0007 * Math.abs(currentCurvature);

  // 7. Net Force and Acceleration
  let netForceN = availableTractiveForce * prev.reverser;

  // Gravity force pushes backward if going uphill (+), forward if downhill (-)
  netForceN -= gravitySlopeForceN;

  // Drag and curve resistance always oppose movement
  if (speedAbs > 0.05) {
    const motionSign = Math.sign(prev.speedMs);
    netForceN -= (totalDragN + curveResistanceN) * motionSign;

    // Brake opposes motion
    netForceN -= brakingForceN * motionSign;
  } else {
    // Static hold: if brake is applied or train stopped on slight grade
    if (brakingForceN > Math.abs(netForceN)) {
      netForceN = 0;
    }
  }

  // a = F / m
  const accelerationMs2 = netForceN / TRAIN_TOTAL_MASS_KG;

  // 8. Integrate Speed and Distance
  let newSpeedMs = prev.speedMs + accelerationMs2 * dt;

  // Prevent endless micro-reversals around zero when stopped with brakes
  if (speedAbs < 0.1 && (brakingForceN > 30000 || actualThrottle === 0)) {
    if (Math.abs(gravitySlopeForceN) < brakingForceN + dragA) {
      newSpeedMs = 0;
    }
  }

  // Prevent backward motion if reverser is forward and train was stopped
  if (prev.reverser === 1 && prev.speedMs >= 0 && newSpeedMs < 0 && Math.abs(newSpeedMs) < 0.2) {
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
 * Estimate stopping distance from current speed under full service brake
 */
export function estimateStoppingDistanceMeters(speedKmh: number, slopePercent: number): number {
  if (speedKmh <= 0.5) return 0;
  const v = speedKmh / 3.6;
  // Deceleration a ~ (F_brake + drag + slope) / M
  const avgBrakeDecel = (MAX_BRAKING_FORCE_N * 0.75) / TRAIN_TOTAL_MASS_KG + (slopePercent / 100) * GRAVITY_MS2;
  const effectiveDecel = Math.max(0.2, avgBrakeDecel);
  return (v * v) / (2 * effectiveDecel) + v * 1.5; // includes 1.5s air brake application delay
}
