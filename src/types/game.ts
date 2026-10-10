export type WeatherType = 'clear' | 'rain' | 'fog' | 'snow' | 'sunset';

export type SemaphoreAspect = 'green' | 'yellow' | 'red';

export type CameraView = 'cab' | 'chase' | 'trackside';

export interface StationData {
  id: string;
  name: string;
  distanceMeters: number;
  platformLength: number;
  passengersWaiting: number;
  speedLimitApproach: number; // km/h
  description: string;
  sceneryType: 'meadow' | 'forest' | 'town' | 'ravine';
}

export interface SemaphoreData {
  id: string;
  distanceMeters: number;
  aspect: SemaphoreAspect;
  name: string;
}

export interface SpeedLimitSign {
  distanceMeters: number;
  limitKmh: number;
  description?: string;
}

export interface SceneryFeature {
  distanceMeters: number;
  lengthMeters: number;
  type: 'meadow' | 'farmland' | 'forest' | 'river_bridge' | 'ravine_trestle' | 'town' | 'canyon';
  name: string;
  description: string;
  waterLevel?: number;
  bridgeHeight?: number;
}

export interface CurveSection {
  startDistance: number;
  endDistance: number;
  curvature: number; // -1 (sharp left) to +1 (sharp right)
  name?: string;
}

export interface GradientSection {
  startDistance: number;
  endDistance: number;
  slopePercent: number; // + uphill %, - downhill %
}

export interface ViolationRecord {
  id: string;
  timestamp: number;
  description: string;
  pointsDeducted: number;
  locationKm: number;
  type: 'speeding' | 'spad' | 'missed_station' | 'rough_stop' | 'curve_overspeed';
}

export interface TrainPhysicsState {
  distanceMeters: number; // current location along route
  speedKmh: number; // current speed
  speedMs: number; // m/s
  accelerationMs2: number; // current acceleration
  throttlePercent: number; // 0 to 100
  actualThrottle: number; // engine RPM lag (0 to 100)
  brakePercent: number; // 0 to 100
  brakePipePressureBar: number; // 5.0 bar normal, down to 0.0 emergency
  brakeCylinderPressureBar: number; // 0.0 to 3.8 bar
  reverser: 1 | 0 | -1; // Forward, Neutral, Reverse
  tractiveForceKn: number;
  brakingForceKn: number;
  slopePercent: number;
  currentCurvature: number;
  wheelSlip: boolean;
  emergencyBrakeActive: boolean;
}

export interface StationStopProgress {
  station: StationData;
  stoppedInsideZone: boolean;
  offsetMeters: number; // difference from ideal stop marker
  boardingProgress: number; // 0 to 100
  isBoarding: boolean;
  isComplete: boolean;
  passengersBoarded: number;
}

export interface GameStats {
  totalDistanceKm: number;
  passengersDelivered: number;
  maxSpeedAchieved: number;
  startTime: number;
  cleanStations: number;
}
