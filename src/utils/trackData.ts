import {
  StationData,
  SemaphoreData,
  SpeedLimitSign,
  SceneryFeature,
  CurveSection,
  GradientSection,
} from '../types/game';

export const TOTAL_ROUTE_METERS = 14500; // 14.5 km route

export const STATIONS: StationData[] = [
  {
    id: 'station_1',
    name: 'Meadowbrook Halt',
    distanceMeters: 1400,
    platformLength: 130,
    passengersWaiting: 18,
    speedLimitApproach: 50,
    description: 'Rustic wooden shelter surrounded by lush meadows and wildflower fields.',
    sceneryType: 'meadow',
  },
  {
    id: 'station_2',
    name: 'Pinecrest Valley',
    distanceMeters: 4600,
    platformLength: 150,
    passengersWaiting: 28,
    speedLimitApproach: 50,
    description: 'Timber station nestled amidst towering ancient pines and mountain foothills.',
    sceneryType: 'forest',
  },
  {
    id: 'station_3',
    name: 'St. Johann Bergstadt',
    distanceMeters: 9200,
    platformLength: 180,
    passengersWaiting: 46,
    speedLimitApproach: 45,
    description: 'Historic alpine town with cobblestone platforms, clock tower, and mountain chalets.',
    sceneryType: 'town',
  },
  {
    id: 'station_4',
    name: 'Eagles Nest Terminal',
    distanceMeters: 14100,
    platformLength: 200,
    passengersWaiting: 38,
    speedLimitApproach: 40,
    description: 'Grand scenic terminus perched high on the canyon rim over the deep ravine.',
    sceneryType: 'ravine',
  },
];

export const SPEED_LIMITS: SpeedLimitSign[] = [
  { distanceMeters: 0, limitKmh: 60, description: 'Yard Departure' },
  { distanceMeters: 400, limitKmh: 80, description: 'Meadow Valley Track' },
  { distanceMeters: 1050, limitKmh: 50, description: 'Meadowbrook Approach' },
  { distanceMeters: 1650, limitKmh: 90, description: 'Farmland Straight' },
  { distanceMeters: 3100, limitKmh: 70, description: 'Pine Forest Curves' },
  { distanceMeters: 4200, limitKmh: 50, description: 'Pinecrest Approach' },
  { distanceMeters: 4900, limitKmh: 85, description: 'River Gorge Straight' },
  { distanceMeters: 5900, limitKmh: 60, description: 'Stone Arch River Viaduct' },
  { distanceMeters: 7400, limitKmh: 80, description: 'Highland Pasture' },
  { distanceMeters: 8650, limitKmh: 45, description: 'St. Johann Town Zone' },
  { distanceMeters: 9700, limitKmh: 75, description: 'Foothill Gradient' },
  { distanceMeters: 11200, limitKmh: 55, description: 'Deep Ravine Trestle Bridge' },
  { distanceMeters: 13300, limitKmh: 40, description: 'Eagles Nest Terminus Approach' },
];

export const SEMAPHORES: SemaphoreData[] = [
  { id: 'sig_1', distanceMeters: 750, aspect: 'green', name: 'Block Sig 1 - Meadow South' },
  { id: 'sig_2', distanceMeters: 2300, aspect: 'green', name: 'Block Sig 2 - Windmill Crossing' },
  { id: 'sig_3', distanceMeters: 3950, aspect: 'yellow', name: 'Block Sig 3 - Pinecrest Distant' },
  { id: 'sig_4', distanceMeters: 5800, aspect: 'green', name: 'Block Sig 4 - Viaduct Entry' },
  { id: 'sig_5', distanceMeters: 7200, aspect: 'green', name: 'Block Sig 5 - Viaduct Exit' },
  { id: 'sig_6', distanceMeters: 8500, aspect: 'yellow', name: 'Block Sig 6 - St. Johann Approach' },
  { id: 'sig_7', distanceMeters: 10600, aspect: 'green', name: 'Block Sig 7 - Mountain Pass' },
  { id: 'sig_8', distanceMeters: 12050, aspect: 'green', name: 'Block Sig 8 - Trestle Guard' },
  { id: 'sig_9', distanceMeters: 13650, aspect: 'yellow', name: 'Block Sig 9 - Terminus Home' },
];

export const SCENERY_FEATURES: SceneryFeature[] = [
  {
    distanceMeters: 0,
    lengthMeters: 2000,
    type: 'meadow',
    name: 'Sunlit Meadows',
    description: 'Rolling green hills with grazing cattle and colorful alpine wildflowers.',
  },
  {
    distanceMeters: 2000,
    lengthMeters: 1300,
    type: 'farmland',
    name: 'Valley Farmlands',
    description: 'Golden wheat fields, rustic red barns, and rotating wooden windmills.',
  },
  {
    distanceMeters: 3300,
    lengthMeters: 2500,
    type: 'forest',
    name: 'Whispering Pines',
    description: 'Dense dark spruce and birch forest with sun shafts piercing through the canopy.',
  },
  {
    distanceMeters: 5800,
    lengthMeters: 1500,
    type: 'river_bridge',
    name: 'Grand River Viaduct',
    description: 'Majestic 8-arch stone viaduct towering 50 meters above a rushing alpine river.',
    waterLevel: 45,
    bridgeHeight: 52,
  },
  {
    distanceMeters: 7300,
    lengthMeters: 1200,
    type: 'farmland',
    name: 'Terraced Alpine Pastures',
    description: 'Picturesque hillside cottages and grazing sheep under the mountain shadows.',
  },
  {
    distanceMeters: 8500,
    lengthMeters: 1800,
    type: 'town',
    name: 'St. Johann Bergstadt',
    description: 'Historic town with cobblestone squares, church spires, and colorful timber houses.',
  },
  {
    distanceMeters: 10300,
    lengthMeters: 1800,
    type: 'forest',
    name: 'Ravine Forest Passage',
    description: 'Twisting track carved into rock walls surrounded by mountain pines.',
  },
  {
    distanceMeters: 12100,
    lengthMeters: 1400,
    type: 'ravine_trestle',
    name: 'Eagle Gorge Steel Trestle',
    description: 'Daring steel lattice trestle bridge spanning a deep chasm ravine with misty depths.',
    waterLevel: 15,
    bridgeHeight: 68,
  },
  {
    distanceMeters: 13500,
    lengthMeters: 1000,
    type: 'canyon',
    name: 'Eagles Nest Terminus',
    description: 'Grand scenic terminus station on the mountain crest overlooking the entire valley.',
  },
];

export const CURVE_SECTIONS: CurveSection[] = [
  { startDistance: 450, endDistance: 1100, curvature: 0.38, name: 'Meadow Curve Right' },
  { startDistance: 1800, endDistance: 2700, curvature: -0.44, name: 'Windmill Bend Left' },
  { startDistance: 3300, endDistance: 3900, curvature: 0.52, name: 'Forest S-Turn Right' },
  { startDistance: 3900, endDistance: 4400, curvature: -0.48, name: 'Forest S-Turn Left' },
  { startDistance: 6000, endDistance: 7100, curvature: 0.42, name: 'Viaduct Grand Arc Right' },
  { startDistance: 8200, endDistance: 8900, curvature: -0.55, name: 'Town Approach Curve' },
  { startDistance: 9500, endDistance: 10200, curvature: 0.35, name: 'Bergstadt Exit Arc' },
  { startDistance: 11400, endDistance: 12000, curvature: -0.58, name: 'Canyon Razor Curve' },
  { startDistance: 12200, endDistance: 13100, curvature: 0.32, name: 'Trestle Gentle Arc' },
];

export const GRADIENT_SECTIONS: GradientSection[] = [
  { startDistance: 0, endDistance: 1200, slopePercent: 0.2 },
  { startDistance: 1200, endDistance: 3000, slopePercent: 1.4 }, // Uphill
  { startDistance: 3000, endDistance: 4500, slopePercent: -1.2 }, // Downhill
  { startDistance: 4500, endDistance: 5800, slopePercent: 0.0 },
  { startDistance: 5800, endDistance: 7400, slopePercent: 0.4 }, // Viaduct slight rise
  { startDistance: 7400, endDistance: 8700, slopePercent: 1.8 }, // Steep climb
  { startDistance: 8700, endDistance: 10000, slopePercent: -1.6 }, // Town descent
  { startDistance: 10000, endDistance: 12200, slopePercent: 2.1 }, // Climb to canyon
  { startDistance: 12200, endDistance: 13600, slopePercent: -0.8 }, // High trestle
  { startDistance: 13600, endDistance: 14500, slopePercent: 0.5 },
];

/**
 * Helper to get current speed limit at distance
 */
export function getCurrentSpeedLimit(distanceMeters: number): number {
  let activeLimit = 60;
  for (const sign of SPEED_LIMITS) {
    if (distanceMeters >= sign.distanceMeters) {
      activeLimit = sign.limitKmh;
    } else {
      break;
    }
  }
  return activeLimit;
}

/**
 * Get next upcoming speed limit and distance
 */
export function getNextSpeedLimit(distanceMeters: number): { sign: SpeedLimitSign; distanceTo: number } | null {
  for (const sign of SPEED_LIMITS) {
    if (sign.distanceMeters > distanceMeters) {
      return { sign, distanceTo: sign.distanceMeters - distanceMeters };
    }
  }
  return null;
}

/**
 * Helper to get current curvature at distance
 */
export function getCurrentCurvature(distanceMeters: number): number {
  for (const curve of CURVE_SECTIONS) {
    if (distanceMeters >= curve.startDistance && distanceMeters <= curve.endDistance) {
      // Smooth fade in / out of curvature
      const length = curve.endDistance - curve.startDistance;
      const progress = (distanceMeters - curve.startDistance) / length;
      const envelope = Math.sin(progress * Math.PI);
      return curve.curvature * envelope;
    }
  }
  return 0;
}

/**
 * Helper to get current track gradient at distance
 */
export function getCurrentGradient(distanceMeters: number): number {
  for (const grad of GRADIENT_SECTIONS) {
    if (distanceMeters >= grad.startDistance && distanceMeters <= grad.endDistance) {
      return grad.slopePercent;
    }
  }
  return 0;
}

/**
 * Helper to get current scenery feature
 */
export function getCurrentScenery(distanceMeters: number): SceneryFeature {
  for (const feat of SCENERY_FEATURES) {
    if (distanceMeters >= feat.distanceMeters && distanceMeters <= feat.distanceMeters + feat.lengthMeters) {
      return feat;
    }
  }
  return SCENERY_FEATURES[0];
}

/**
 * Find next upcoming semaphore
 */
export function getNextSemaphore(distanceMeters: number): { semaphore: SemaphoreData; distanceTo: number } | null {
  for (const sig of SEMAPHORES) {
    if (sig.distanceMeters > distanceMeters) {
      return { semaphore: sig, distanceTo: sig.distanceMeters - distanceMeters };
    }
  }
  return null;
}

/**
 * Find next upcoming station
 */
export function getNextStation(distanceMeters: number): { station: StationData; distanceTo: number } | null {
  for (const station of STATIONS) {
    if (station.distanceMeters + station.platformLength / 2 > distanceMeters) {
      return { station, distanceTo: station.distanceMeters - distanceMeters };
    }
  }
  return null;
}
