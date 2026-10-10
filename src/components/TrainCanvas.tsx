import React, { useRef, useEffect } from 'react';
import {
  TrainPhysicsState,
  WeatherType,
  CameraView,
  SemaphoreData,
  StationData,
  SpeedLimitSign,
  HeadlightMode,
  WiperMode,
} from '../types/game';
import {
  STATIONS,
  SEMAPHORES,
  SPEED_LIMITS,
  getCurrentScenery,
} from '../utils/trackData';

interface TrainCanvasProps {
  physics: TrainPhysicsState;
  weather: WeatherType;
  cameraView: CameraView;
  wiperMode: WiperMode;
  headlightMode: HeadlightMode;
  windshieldMoisture: number; // 0 to 100%
  hornActive: boolean;
  activeStationStop: { station: StationData; isBoarding: boolean; boardingProgress: number } | null;
}

export const TrainCanvas: React.FC<TrainCanvasProps> = ({
  physics,
  weather,
  cameraView,
  wiperMode,
  headlightMode,
  windshieldMoisture,
  hornActive,
  activeStationStop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        const targetW = Math.max(640, Math.floor(rect.width));
        const targetH = Math.max(360, Math.floor(rect.height));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Camera sway & vibration calculations
      let swayX = 0;
      let swayY = 0;
      let rollAngle = 0;

      if (cameraView === 'cab') {
        const speedRatio = Math.min(1.2, Math.abs(physics.speedKmh) / 100);
        // Engine vibration
        const engineVibe = Math.sin(time * 0.035) * (1.2 * (physics.actualThrottle / 100) + speedRatio * 1.5);
        // Rail joint rhythm bump
        const railBump = Math.sin(time * 0.012 * Math.max(1, physics.speedKmh)) * 1.8 * speedRatio;
        // Curve centrifugal lean
        const curveLean = physics.currentCurvature * speedRatio * 16;

        swayX = -curveLean + Math.sin(time * 0.003) * 2;
        swayY = engineVibe + railBump;
        rollAngle = (physics.currentCurvature * speedRatio * 0.035) + (physics.accelerationMs2 * 0.005);
      } else if (cameraView === 'chase') {
        swayX = -physics.currentCurvature * 24;
        swayY = 4 + Math.sin(time * 0.004) * 2;
        rollAngle = physics.currentCurvature * 0.02;
      }

      ctx.save();
      // Apply camera shake / roll
      ctx.translate(width / 2 + swayX, height / 2 + swayY);
      ctx.rotate(rollAngle);
      ctx.translate(-width / 2, -height / 2);

      // 1. DYNAMIC PROCEDURAL SKY
      drawProceduralSky(ctx, width, height, weather, time);

      // 2. MULTI-LAYERED PARALLAX PROCEDURAL MOUNTAINS (Actually moves with train progress!)
      drawProceduralMountains(ctx, width, height, physics.distanceMeters, physics.currentCurvature, weather);

      // 3. CONTINUOUS STREAMING PROCEDURAL TERRAIN & PAYSAGE
      const scenery = getCurrentScenery(physics.distanceMeters);
      drawStreamingLandscape(ctx, width, height, scenery, physics.distanceMeters, physics.currentCurvature, weather, time);

      // 4. PERSPECTIVE RAILWAY TRACK, SLEEPERS, RAILS & INFRASTRUCTURE
      drawTrackAndInfrastructure(ctx, width, height, physics, scenery, time, headlightMode);

      // 5. SIGNALS, SEMAPHORES & SPEED LIMIT SIGNS
      drawTrackObjects(ctx, width, height, physics, time);

      // 6. STATIONS & PASSENGERS
      drawStations(ctx, width, height, physics, activeStationStop);

      // 7. WEATHER EFFECTS (Rain, Fog, Snow) & HEADLIGHT VISIBILITY
      drawWeatherAmbiance(ctx, width, height, weather, time, headlightMode);

      // 8. EXTERNAL TRAIN CARRIAGES (In Chase / Trackside view)
      if (cameraView === 'chase' || cameraView === 'trackside') {
        drawExternalTrain(ctx, width, height, physics, time, headlightMode, hornActive);
      }

      ctx.restore();

      // 9. CABIN WINDSHIELD, WIPERS & VISIBILITY DYNAMICS (Only in Cab View)
      if (cameraView === 'cab') {
        drawCabWindshield(ctx, width, height, weather, wiperMode, windshieldMoisture, time);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [physics, weather, cameraView, wiperMode, headlightMode, windshieldMoisture, hornActive, activeStationStop]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        width={1440}
        height={820}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};

/* =========================================================================
   100% PROGRAMMATIC PROCEDURAL ENGINE
   ========================================================================= */

function drawProceduralSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  time: number
) {
  const horizonY = h * 0.44;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);

  switch (weather) {
    case 'clear':
      skyGrad.addColorStop(0, '#1d4ed8'); // Alpine azure
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      break;
    case 'sunset':
      skyGrad.addColorStop(0, '#2e1065'); // Twilight deep purple
      skyGrad.addColorStop(0.35, '#831843');
      skyGrad.addColorStop(0.7, '#ea580c');
      skyGrad.addColorStop(1, '#fef08a');
      break;
    case 'rain':
      skyGrad.addColorStop(0, '#1e293b');
      skyGrad.addColorStop(0.6, '#334155');
      skyGrad.addColorStop(1, '#64748b');
      break;
    case 'fog':
      skyGrad.addColorStop(0, '#334155');
      skyGrad.addColorStop(0.6, '#64748b');
      skyGrad.addColorStop(1, '#94a3b8');
      break;
    case 'snow':
      skyGrad.addColorStop(0, '#334155');
      skyGrad.addColorStop(0.5, '#64748b');
      skyGrad.addColorStop(1, '#cbd5e1');
      break;
  }

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // Radiant Sun
  if (weather === 'clear' || weather === 'sunset') {
    const sunX = w * 0.75;
    const sunY = h * 0.2;
    const sunRadius = weather === 'sunset' ? 45 : 35;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 160);
    sunGlow.addColorStop(0, weather === 'sunset' ? 'rgba(254, 240, 138, 1)' : 'rgba(255, 255, 255, 1)');
    sunGlow.addColorStop(0.35, weather === 'sunset' ? 'rgba(249, 115, 22, 0.6)' : 'rgba(253, 224, 71, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 160, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drifting Cumulus Clouds
  const cloudColor = weather === 'sunset' ? 'rgba(254, 215, 170, 0.4)' : 'rgba(255, 255, 255, 0.55)';
  ctx.fillStyle = cloudColor;
  for (let c = 0; c < 5; c++) {
    const cx = ((time * 0.006 + c * 340) % (w + 400)) - 200;
    const cy = h * 0.08 + (c % 3) * 35;
    drawPuffyCloud(ctx, cx, cy, 90 + (c % 3) * 25, 36 + (c % 2) * 12);
  }
}

function drawPuffyCloud(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
  ctx.ellipse(x - rw * 0.35, y + rh * 0.2, rw * 0.55, rh * 0.6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + rw * 0.35, y + rh * 0.15, rw * 0.6, rh * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Procedural Multi-layer Parallax Mountains
 * Seamlessly moves and pans proportionally to train distance and curve heading!
 */
function drawProceduralMountains(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  distMeters: number,
  curve: number,
  weather: WeatherType
) {
  const horizonY = h * 0.44;

  // Mountain Layer 1: Distant Snow-capped Alpine Giants (Slow parallax: 0.008x)
  const shift1 = (distMeters * 0.008 + curve * 40) % (w * 2);
  drawAlpineMountainChain(
    ctx,
    w,
    horizonY,
    shift1,
    180,
    weather === 'sunset' ? '#4a1d63' : '#1e3a5f',
    true // Has snow caps!
  );

  // Mountain Layer 2: Mid-range Jagged Dolomite Peaks (Parallax: 0.022x)
  const shift2 = (distMeters * 0.022 + curve * 80) % (w * 2);
  drawAlpineMountainChain(
    ctx,
    w,
    horizonY,
    shift2,
    130,
    weather === 'sunset' ? '#6b21a8' : '#155e75',
    false
  );

  // Mountain Layer 3: Rolling Pine Foothills (Parallax: 0.055x)
  const shift3 = (distMeters * 0.055 + curve * 120) % (w * 2);
  drawRollingFoothills(
    ctx,
    w,
    horizonY,
    shift3,
    75,
    weather === 'snow' ? '#64748b' : weather === 'sunset' ? '#371b58' : '#065f46'
  );
}

function drawAlpineMountainChain(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  shift: number,
  peakHeight: number,
  fillColor: string,
  hasSnowCaps: boolean
) {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);

  const step = 25;
  const numSteps = Math.ceil(w / step) + 2;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const x = i * step;
    const worldX = x + shift;
    // Harmonic procedural peaks
    const h1 = Math.sin(worldX * 0.004) * (peakHeight * 0.7);
    const h2 = Math.cos(worldX * 0.01) * (peakHeight * 0.35);
    const h3 = Math.sin(worldX * 0.022) * (peakHeight * 0.15);
    const peakY = horizonY - peakHeight * 0.6 - (h1 + h2 + h3);
    ctx.lineTo(x, peakY);
    points.push({ x, y: peakY });
  }

  ctx.lineTo(w, horizonY);
  ctx.closePath();
  ctx.fill();

  // Draw procedural snow caps on tall peaks
  if (hasSnowCaps) {
    ctx.fillStyle = '#ffffff';
    for (let p = 1; p < points.length - 1; p++) {
      const pt = points[p];
      if (pt.y < horizonY - peakHeight * 0.85) {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - 24, pt.y + 32);
        ctx.lineTo(pt.x, pt.y + 22);
        ctx.lineTo(pt.x + 24, pt.y + 34);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawRollingFoothills(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number,
  shift: number,
  height: number,
  fillColor: string
) {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);

  const step = 30;
  for (let x = 0; x <= w + step; x += step) {
    const worldX = x + shift;
    const hillY = horizonY - 20 - Math.sin(worldX * 0.007) * (height * 0.6) - Math.cos(worldX * 0.015) * (height * 0.4);
    ctx.lineTo(x, hillY);
  }

  ctx.lineTo(w, horizonY);
  ctx.closePath();
  ctx.fill();
}

/**
 * Continuous Streaming Procedural Landscape:
 * Meadows, wildflowers, grazing cows, fences, windmills with spinning sails,
 * red barns, dense pine forests, deep river gorges with stone arches, towns, and ravines!
 */
function drawStreamingLandscape(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scenery: ReturnType<typeof getCurrentScenery>,
  distMeters: number,
  curve: number,
  weather: WeatherType,
  time: number
) {
  const horizonY = h * 0.44;

  // Ground base gradient
  let groundBaseColor = '#2d6a4f'; // Lush emerald meadow
  let groundFarColor = '#40916c';

  if (scenery.type === 'farmland') {
    groundBaseColor = '#856126'; // Golden harvest
    groundFarColor = '#a9843d';
  } else if (scenery.type === 'forest') {
    groundBaseColor = '#1b4332'; // Deep spruce
    groundFarColor = '#2d6a4f';
  } else if (scenery.type === 'river_bridge' || scenery.type === 'ravine_trestle' || scenery.type === 'canyon') {
    groundBaseColor = '#292524'; // Granite stone chasm
    groundFarColor = '#44403c';
  } else if (scenery.type === 'town') {
    groundBaseColor = '#334155'; // Cobblestone & slate
    groundFarColor = '#475569';
  }

  if (weather === 'snow') {
    groundBaseColor = '#e2e8f0';
    groundFarColor = '#cbd5e1';
  }

  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  groundGrad.addColorStop(0, groundFarColor);
  groundGrad.addColorStop(0.35, groundBaseColor);
  groundGrad.addColorStop(1, '#0f172a');

  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // If in River Viaduct or Ravine Trestle, draw deep gorge & rushing rapids!
  if (scenery.type === 'river_bridge' || scenery.type === 'ravine_trestle') {
    drawRiverChasmAndRapids(ctx, w, h, horizonY, scenery.type, time);
  }

  // STREAMING WORLD OBJECTS
  // Iterate along relative track distance from 400m ahead down to 10m in front of train!
  drawStreamingWorldObjects(ctx, w, h, horizonY, scenery, distMeters, curve, weather, time);
}

function drawRiverChasmAndRapids(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  type: string,
  time: number
) {
  // Sheer stepped granite cliffs opening on both sides
  ctx.fillStyle = '#1c1917';
  // Left cliff
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w * 0.32, horizonY + 70);
  ctx.lineTo(w * 0.18, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Right cliff
  ctx.beginPath();
  ctx.moveTo(w, horizonY);
  ctx.lineTo(w * 0.68, horizonY + 70);
  ctx.lineTo(w * 0.82, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Deep roaring alpine river
  const riverY = horizonY + 95;
  const riverH = h * 0.38;
  const riverGrad = ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
  riverGrad.addColorStop(0, '#0284c7');
  riverGrad.addColorStop(0.5, '#06b6d4'); // Turquoise glacial river
  riverGrad.addColorStop(1, '#0e7490');

  ctx.fillStyle = riverGrad;
  ctx.fillRect(w * 0.22, riverY, w * 0.56, riverH);

  // Foaming rapids and white-water rapids streaming
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) {
    const waveY = riverY + 12 + i * 20;
    const waveOffset = Math.sin(time * 0.009 + i * 1.8) * 22;
    ctx.beginPath();
    ctx.moveTo(w * 0.25 + waveOffset, waveY);
    ctx.bezierCurveTo(
      w * 0.4 + waveOffset,
      waveY - 7,
      w * 0.6 - waveOffset,
      waveY + 7,
      w * 0.75 + waveOffset,
      waveY
    );
    ctx.stroke();
  }

  // Stone viaduct bridge arches or steel trestle struts supporting track
  if (type === 'river_bridge') {
    ctx.fillStyle = '#44403c';
    const piers = [w * 0.35, w * 0.5, w * 0.65];
    piers.forEach((px) => {
      ctx.fillRect(px - 20, horizonY + 25, 40, h * 0.55);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - 20, horizonY + 25, 40, h * 0.55);
    });
  } else if (type === 'ravine_trestle') {
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 4;
    const trestles = [w * 0.38, w * 0.5, w * 0.62];
    trestles.forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(tx - 26, h);
      ctx.lineTo(tx, horizonY + 28);
      ctx.lineTo(tx + 26, h);
      ctx.stroke();
    });
  }
}

/**
 * Draws all streaming 3D perspective landscape objects that smoothly advance
 * as the train travels forward along the line:
 */
function drawStreamingWorldObjects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  scenery: ReturnType<typeof getCurrentScenery>,
  distMeters: number,
  curve: number,
  weather: WeatherType,
  time: number
) {
  const cx = w * 0.5;

  // Track-relative streaming slots spaced every 35 meters along world track
  const spacing = 35;
  const nearestSlot = Math.floor(distMeters / spacing) * spacing;

  // Render objects within 380m ahead of train, sorted from far to near for correct depth!
  for (let slotDist = nearestSlot + 380; slotDist >= nearestSlot + 10; slotDist -= spacing) {
    const relDist = slotDist - distMeters;
    if (relDist <= 6 || relDist > 380) continue;

    // Perspective depth z: 0 (at horizon 380m) to 1 (near train)
    const z = 1 - relDist / 380;
    const scale = Math.pow(z, 2.3);
    const groundY = horizonY + (h - horizonY) * scale * 0.8;

    // Lateral position with curve bending
    const curveOffset = curve * (1 - z) * 160;
    const leftX = cx + curveOffset - (260 * scale) - (140 * scale);
    const rightX = cx + curveOffset + (260 * scale) + (140 * scale);

    // Deterministic pseudo-random seed based on absolute slot distance
    const seed = Math.sin(slotDist * 12.9898) * 43758.5453;
    const rand = Math.abs(seed - Math.floor(seed));

    // RENDER BIOME-SPECIFIC OBJECTS
    if (scenery.type === 'meadow' || scenery.type === 'farmland') {
      // Wildflower patches streaming
      if (rand < 0.45 && scale > 0.15) {
        drawWildflowerPatch(ctx, leftX + 40 * scale, groundY, scale * 30, time);
      }
      // Grazing cattle or sheep
      if (rand > 0.65 && scale > 0.2) {
        drawGrazingCow(ctx, rightX + 60 * scale, groundY, scale * 38);
      }
      // Wooden rail fence along track
      drawSplitRailFence(ctx, leftX + 80 * scale, groundY, scale * 26);
      drawSplitRailFence(ctx, rightX - 80 * scale, groundY, scale * 26);

      // Rotating Windmill or Red Barn
      if (slotDist % 210 === 0) {
        drawRotatingWindmill(ctx, rightX + 70 * scale, groundY, scale * 95, time);
      } else if (slotDist % 140 === 0) {
        drawTimberBarn(ctx, leftX - 40 * scale, groundY, scale * 85);
      } else {
        // Pine or Oak trees
        drawPineTree(ctx, leftX, groundY, scale * 75, '#2e7d32');
        drawPineTree(ctx, rightX, groundY, scale * 80, '#388e3c');
      }
    } else if (scenery.type === 'forest') {
      // Dense whispering pine trees rushing past
      drawPineTree(ctx, leftX - 25 * scale, groundY, scale * 105, '#1b5e20');
      drawPineTree(ctx, leftX + 35 * scale, groundY - 10 * scale, scale * 90, '#0d3813');
      drawPineTree(ctx, rightX + 25 * scale, groundY, scale * 110, '#1b5e20');
      drawPineTree(ctx, rightX - 30 * scale, groundY - 8 * scale, scale * 95, '#2e7d32');
    } else if (scenery.type === 'town') {
      // European Alpine village chalets, church, and lanterns
      if (slotDist % 175 === 0) {
        drawTownChurchWithSpire(ctx, rightX + 60 * scale, groundY, scale * 120);
      } else {
        drawAlpineChalet(ctx, leftX - 20 * scale, groundY, scale * 85, '#e2e8f0', '#991b1b', time);
        drawAlpineChalet(ctx, rightX + 30 * scale, groundY, scale * 90, '#fef08a', '#1e3a5f', time);
      }
    } else if (scenery.type === 'canyon' || scenery.type === 'ravine_trestle') {
      // Mountain waterfall on canyon wall
      if (slotDist % 280 === 0) {
        drawMountainWaterfall(ctx, leftX - 60 * scale, groundY, scale * 110, time);
      }
      // Rock crags and pine trees
      drawPineTree(ctx, leftX, groundY, scale * 70, '#166534');
      drawPineTree(ctx, rightX, groundY, scale * 75, '#15803d');
    }
  }
}

function drawWildflowerPatch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) {
  if (size < 4) return;
  const colors = ['#ef4444', '#f59e0b', '#38bdf8', '#ffffff', '#ec4899'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const fx = x + Math.sin(i * 1.5) * size;
    const fy = y + Math.cos(i * 1.5) * (size * 0.4);
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(1.5, size * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrazingCow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (size < 8) return;
  // Cow body (white with black patches)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - size * 0.45, y - size * 0.35, size * 0.9, size * 0.35);

  // Black spots
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.22, size * 0.14, 0, Math.PI * 2);
  ctx.arc(x + size * 0.2, y - size * 0.18, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Head grazing down
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - size * 0.6, y - size * 0.28, size * 0.22, size * 0.26);

  // Legs
  ctx.fillStyle = '#1c1917';
  const legW = size * 0.08;
  const legH = size * 0.25;
  ctx.fillRect(x - size * 0.4, y - legH, legW, legH);
  ctx.fillRect(x - size * 0.25, y - legH, legW, legH);
  ctx.fillRect(x + size * 0.2, y - legH, legW, legH);
  ctx.fillRect(x + size * 0.35, y - legH, legW, legH);
}

function drawSplitRailFence(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (size < 5) return;
  ctx.strokeStyle = '#78350f'; // Rustic wood
  ctx.lineWidth = Math.max(1, size * 0.1);
  // Post
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size);
  ctx.stroke();
  // Rails
  ctx.beginPath();
  ctx.moveTo(x - size * 0.8, y - size * 0.7);
  ctx.lineTo(x + size * 0.8, y - size * 0.7);
  ctx.moveTo(x - size * 0.8, y - size * 0.35);
  ctx.lineTo(x + size * 0.8, y - size * 0.35);
  ctx.stroke();
}

function drawRotatingWindmill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number
) {
  if (size < 12) return;
  // Windmill octagonal masonry tower
  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, y);
  ctx.lineTo(x - size * 0.2, y - size * 0.9);
  ctx.lineTo(x + size * 0.2, y - size * 0.9);
  ctx.lineTo(x + size * 0.35, y);
  ctx.closePath();
  ctx.fill();

  // Cap roof
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.24, y - size * 0.9);
  ctx.lineTo(x, y - size * 1.15);
  ctx.lineTo(x + size * 0.24, y - size * 0.9);
  ctx.closePath();
  ctx.fill();

  // 4 ROTATING LATTICE SAILS
  const hubY = y - size * 0.95;
  const rotAngle = time * 0.0018; // Smooth continuous rotation!

  ctx.save();
  ctx.translate(x, hubY);
  ctx.rotate(rotAngle);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  const bladeLen = size * 0.75;

  for (let b = 0; b < 4; b++) {
    ctx.rotate(Math.PI / 2);
    // Spar
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -bladeLen);
    ctx.stroke();
    // Canvas sail lattice
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(size * 0.03, -bladeLen * 0.9, size * 0.16, bladeLen * 0.75);
  }

  // Center axle hub
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2, size * 0.06), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTimberBarn(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (size < 10) return;
  // Classic red timber barn
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(x - size * 0.45, y - size * 0.55, size * 0.9, size * 0.55);

  // Pitched roof
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.52, y - size * 0.55);
  ctx.lineTo(x, y - size * 0.9);
  ctx.lineTo(x + size * 0.52, y - size * 0.55);
  ctx.closePath();
  ctx.fill();

  // White cross door
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - size * 0.18, y - size * 0.38, size * 0.36, size * 0.38);
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeRect(x - size * 0.18, y - size * 0.38, size * 0.36, size * 0.38);
}

function drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string) {
  if (h < 5) return;
  // Trunk
  ctx.fillStyle = '#451a03';
  ctx.fillRect(x - h * 0.08, y - h * 0.25, h * 0.16, h * 0.25);

  // 3-tiered pine foliage
  ctx.fillStyle = color;
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const tierH = h * (0.35 + t * 0.08);
    const tierW = h * (0.4 + t * 0.18);
    const tierY = y - h * 0.2 - t * (h * 0.28);

    ctx.beginPath();
    ctx.moveTo(x, tierY - tierH);
    ctx.lineTo(x - tierW, tierY);
    ctx.lineTo(x + tierW, tierY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAlpineChalet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wallColor: string,
  roofColor: string,
  time: number
) {
  if (size < 12) return;
  // Chalet main block
  ctx.fillStyle = wallColor;
  ctx.fillRect(x - size * 0.45, y - size * 0.65, size * 0.9, size * 0.65);

  // Gabled roof
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.52, y - size * 0.65);
  ctx.lineTo(x, y - size * 1.05);
  ctx.lineTo(x + size * 0.52, y - size * 0.65);
  ctx.closePath();
  ctx.fill();

  // Chimney & smoke
  const chimX = x + size * 0.22;
  const chimY = y - size * 0.95;
  ctx.fillStyle = '#78716c';
  ctx.fillRect(chimX, chimY, size * 0.1, size * 0.25);

  // Animated chimney smoke puff
  ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
  const smokeShift = (time * 0.02) % 25;
  ctx.beginPath();
  ctx.arc(chimX + size * 0.05, chimY - 8 - smokeShift, Math.max(2, size * 0.08), 0, Math.PI * 2);
  ctx.fill();

  // Warm glowing windows
  ctx.fillStyle = '#fbbf24';
  const winSize = size * 0.14;
  ctx.fillRect(x - size * 0.32, y - size * 0.48, winSize, winSize);
  ctx.fillRect(x + size * 0.18, y - size * 0.48, winSize, winSize);
}

function drawTownChurchWithSpire(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (size < 15) return;
  // Church nave
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x - size * 0.45, y - size * 0.6, size * 0.9, size * 0.6);

  // Steep roof
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y - size * 0.6);
  ctx.lineTo(x, y - size * 0.95);
  ctx.lineTo(x + size * 0.5, y - size * 0.6);
  ctx.closePath();
  ctx.fill();

  // Bell Tower
  const towerW = size * 0.32;
  const towerH = size * 1.1;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - towerW / 2, y - towerH, towerW, towerH);

  // Copper green spire
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.moveTo(x - towerW * 0.55, y - towerH);
  ctx.lineTo(x, y - towerH - size * 0.65);
  ctx.lineTo(x + towerW * 0.55, y - towerH);
  ctx.closePath();
  ctx.fill();

  // Gold Clock face
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x, y - towerH + size * 0.22, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountainWaterfall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) {
  if (size < 12) return;
  // Cascading foaming white water
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const fallW = Math.max(3, size * 0.18);
  ctx.fillRect(x - fallW / 2, y - size, fallW, size);

  // Foaming spray mist at base
  ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(4, size * 0.25), 0, Math.PI * 2);
  ctx.fill();
}

function drawTrackAndInfrastructure(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  physics: TrainPhysicsState,
  scenery: ReturnType<typeof getCurrentScenery>,
  time: number,
  headlightMode: HeadlightMode
) {
  const horizonY = h * 0.44;
  const cx = w * 0.5;
  const curve = physics.currentCurvature;

  // Headlight illumination beam in front of train (Off, Low Beam, High Beam)
  if (headlightMode !== 'off') {
    const isHigh = headlightMode === 'high';
    const beamReach = isHigh ? 640 : 360;
    const beamRadius = isHigh ? 580 : 320;
    const beamAlpha = isHigh ? 0.6 : 0.32;
    const beamSpread = isHigh ? 230 : 150;

    const lightGrad = ctx.createRadialGradient(cx, h, 50, cx + curve * 120, horizonY + (isHigh ? 60 : 120), beamRadius);
    lightGrad.addColorStop(0, `rgba(254, 240, 138, ${beamAlpha})`);
    lightGrad.addColorStop(0.45, `rgba(254, 240, 138, ${beamAlpha * 0.4})`);
    lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.moveTo(cx - beamSpread, h);
    ctx.lineTo(cx + curve * 180 - (isHigh ? 55 : 35), horizonY + (isHigh ? 45 : 90));
    ctx.lineTo(cx + curve * 180 + (isHigh ? 55 : 35), horizonY + (isHigh ? 45 : 90));
    ctx.lineTo(cx + beamSpread, h);
    ctx.closePath();
    ctx.fill();

    // High-beam extra long piercing focal beam
    if (isHigh) {
      const coreGrad = ctx.createRadialGradient(cx, h, 20, cx + curve * 180, horizonY + 50, 480);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      coreGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(cx - 100, horizonY + 40, 200, h - horizonY);
    }
  }

  // 1. BALLAST GRAVEL BED
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(cx - 330, h);
  const horizonTrackX = cx + curve * 180;
  ctx.quadraticCurveTo(cx - 150 + curve * 80, (h + horizonY) / 2, horizonTrackX - 32, horizonY);
  ctx.lineTo(horizonTrackX + 32, horizonY);
  ctx.quadraticCurveTo(cx + 150 + curve * 80, (h + horizonY) / 2, cx + 330, h);
  ctx.closePath();
  ctx.fill();

  // 2. WOODEN CROSS TIES (SLEEPERS)
  // Continuous smooth motion matching exact train speed!
  const tieCount = 40;
  const cycleOffset = (physics.distanceMeters % 1.6) / 1.6;

  ctx.fillStyle = '#292524';
  for (let i = 0; i < tieCount; i++) {
    const z = (i + cycleOffset) / tieCount;
    if (z <= 0.04) continue;

    const scale = Math.pow(z, 2.4);
    const tieY = horizonY + (h - horizonY) * scale;
    const tieWidth = 490 * scale;
    const tieHeight = Math.max(3, 15 * scale);
    const tieCurveX = cx + curve * (1 - z) * 180 * (1 - scale * 0.4);

    ctx.fillRect(tieCurveX - tieWidth / 2, tieY - tieHeight / 2, tieWidth, tieHeight);

    // Steel baseplates & spikes
    if (scale > 0.4) {
      ctx.fillStyle = '#78716c';
      const railOffsetX = tieWidth * 0.34;
      ctx.fillRect(tieCurveX - railOffsetX - 6 * scale, tieY - tieHeight / 2, 12 * scale, tieHeight);
      ctx.fillRect(tieCurveX + railOffsetX - 6 * scale, tieY - tieHeight / 2, 12 * scale, tieHeight);
      ctx.fillStyle = '#292524';
    }
  }

  // 3. STEEL RAILS
  const leftRailStart = cx - 148;
  const rightRailStart = cx + 148;
  const leftRailEnd = horizonTrackX - 11;
  const rightRailEnd = horizonTrackX + 11;

  // Rail shadow / base
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(leftRailStart, h);
  ctx.quadraticCurveTo(cx - 80 + curve * 60, (h + horizonY) / 2, leftRailEnd, horizonY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightRailStart, h);
  ctx.quadraticCurveTo(cx + 80 + curve * 60, (h + horizonY) / 2, rightRailEnd, horizonY);
  ctx.stroke();

  // Gleaming polished railhead top
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(leftRailStart, h);
  ctx.quadraticCurveTo(cx - 80 + curve * 60, (h + horizonY) / 2, leftRailEnd, horizonY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightRailStart, h);
  ctx.quadraticCurveTo(cx + 80 + curve * 60, (h + horizonY) / 2, rightRailEnd, horizonY);
  ctx.stroke();

  // Rail bright highlight line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftRailStart - 1, h);
  ctx.quadraticCurveTo(cx - 81 + curve * 60, (h + horizonY) / 2, leftRailEnd, horizonY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightRailStart - 1, h);
  ctx.quadraticCurveTo(cx + 79 + curve * 60, (h + horizonY) / 2, rightRailEnd, horizonY);
  ctx.stroke();

  // 4. OVERHEAD CATENARY WIRE & SIDE MASTS
  drawCatenaryPoles(ctx, w, h, horizonY, cx, curve, physics.distanceMeters);
}

function drawCatenaryPoles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  cx: number,
  curve: number,
  dist: number
) {
  const wireTopY = h * 0.12;
  const wireHorizonY = horizonY - 15;
  const horizonTrackX = cx + curve * 180;

  // Overhead wire
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, wireTopY);
  ctx.lineTo(horizonTrackX, wireHorizonY);
  ctx.stroke();

  // Cantilever Masts spaced every 45 meters
  const mastSpacing = 45;
  const mastCycle = (dist % mastSpacing) / mastSpacing;

  for (let m = 0; m < 5; m++) {
    const z = (m + mastCycle) / 5;
    if (z <= 0.15 || z > 0.95) continue;

    const scale = Math.pow(z, 2.2);
    const mastX = cx + curve * (1 - z) * 160 + (285 * scale);
    const groundY = horizonY + (h - horizonY) * scale;
    const mastH = 285 * scale;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, 6 * scale);
    ctx.beginPath();
    ctx.moveTo(mastX, groundY);
    ctx.lineTo(mastX, groundY - mastH);
    ctx.stroke();

    const armLen = 135 * scale;
    ctx.beginPath();
    ctx.moveTo(mastX, groundY - mastH * 0.92);
    ctx.lineTo(mastX - armLen, groundY - mastH * 0.88);
    ctx.stroke();
  }
}

function drawTrackObjects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  physics: TrainPhysicsState,
  time: number
) {
  const horizonY = h * 0.44;
  const cx = w * 0.5;

  // Draw Semaphores / Block Signals along track
  SEMAPHORES.forEach((sig) => {
    const distTo = sig.distanceMeters - physics.distanceMeters;
    if (distTo > 5 && distTo < 380) {
      const z = 1 - distTo / 380;
      const scale = Math.pow(z, 2.4);
      const groundY = horizonY + (h - horizonY) * scale;
      const sigX = cx + physics.currentCurvature * (1 - z) * 180 + (215 * scale);

      drawSemaphoreMast(ctx, sigX, groundY, scale, sig.aspect, sig.name, distTo, time);
    }
  });

  // Draw Speed Limit Signs
  SPEED_LIMITS.forEach((sign) => {
    const distTo = sign.distanceMeters - physics.distanceMeters;
    if (distTo > 5 && distTo < 340) {
      const z = 1 - distTo / 340;
      const scale = Math.pow(z, 2.4);
      const groundY = horizonY + (h - horizonY) * scale;
      const signX = cx + physics.currentCurvature * (1 - z) * 180 - (215 * scale);

      drawSpeedLimitSign(ctx, signX, groundY, scale, sign.limitKmh, distTo);
    }
  });
}

function drawSemaphoreMast(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  scale: number,
  aspect: SemaphoreData['aspect'],
  name: string,
  distMeters: number,
  time: number
) {
  const mastH = 220 * scale;
  if (mastH < 10) return;

  // Mast post
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(2, 5 * scale);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - mastH);
  ctx.stroke();

  // Head housing
  const headW = 28 * scale;
  const headH = 55 * scale;
  const headY = baseY - mastH + headH * 0.3;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - headW / 2, headY - headH / 2, headW, headH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(x - headW / 2, headY - headH / 2, headW, headH);

  // Semaphore Blade
  const bladeL = 46 * scale;
  const bladeAngle = aspect === 'red' ? 0 : aspect === 'yellow' ? -Math.PI / 4 : -Math.PI / 2.3;
  ctx.save();
  ctx.translate(x + headW / 2, headY);
  ctx.rotate(bladeAngle);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, -4 * scale, bladeL, 8 * scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bladeL * 0.5, -4 * scale, bladeL * 0.25, 8 * scale);
  ctx.restore();

  // Optical Lamps
  const lampRadius = Math.max(2.5, 7 * scale);
  const lampRedY = headY - headH * 0.26;
  const lampYellowY = headY;
  const lampGreenY = headY + headH * 0.26;

  let glowColor = 'rgba(34, 197, 94, 0.9)';
  let haloColor = 'rgba(34, 197, 94, 0.4)';
  let activeLampY = lampGreenY;

  if (aspect === 'red') {
    glowColor = 'rgba(239, 68, 68, 0.95)';
    haloColor = 'rgba(239, 68, 68, 0.5)';
    activeLampY = lampRedY;
  } else if (aspect === 'yellow') {
    glowColor = 'rgba(245, 158, 11, 0.95)';
    haloColor = 'rgba(245, 158, 11, 0.5)';
    activeLampY = lampYellowY;
  }

  // Active bloom halo
  if (scale > 0.2) {
    const haloGrad = ctx.createRadialGradient(x, activeLampY, lampRadius * 0.5, x, activeLampY, lampRadius * 3.5);
    haloGrad.addColorStop(0, glowColor);
    haloGrad.addColorStop(0.5, haloColor);
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(x, activeLampY, lampRadius * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active lamp center
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(x, activeLampY, lampRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpeedLimitSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  scale: number,
  limitKmh: number,
  distMeters: number
) {
  const signH = 140 * scale;
  if (signH < 10) return;

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = Math.max(1.5, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - signH);
  ctx.stroke();

  const radius = Math.max(6, 22 * scale);
  const signCenterY = baseY - signH;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, signCenterY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = Math.max(2, 5 * scale);
  ctx.stroke();

  if (scale > 0.25) {
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.max(9, 20 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${limitKmh}`, x, signCenterY + 1 * scale);
  }
}

function drawStations(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  physics: TrainPhysicsState,
  activeStationStop: TrainCanvasProps['activeStationStop']
) {
  const horizonY = h * 0.44;
  const cx = w * 0.5;

  STATIONS.forEach((station) => {
    const centerDistTo = station.distanceMeters - physics.distanceMeters;

    // Station is visible if anywhere along its 260m length is within 650m ahead or 140m behind
    if (centerDistTo < -140 || centerDistTo > 680) return;

    // 1. ADVANCE STATION WARNING BOARDS (350m and 180m ahead)
    const sign1Dist = centerDistTo - 350;
    if (sign1Dist > 5 && sign1Dist < 360) {
      drawAdvanceStationSign(ctx, w, h, horizonY, cx, physics.currentCurvature, sign1Dist, station.name, 350);
    }

    // 2. CONTINUOUS 240-METER RAISED PLATFORMS & CANOPIES (Multi-bay sampling)
    // We sample platform sections from far end (+120m) to near end (-120m)
    const platformHalfLength = 120;
    const segmentStep = 20; // 20m sections along track

    // Collect visible platform segments sorted from far to near for correct z-depth
    for (let offset = platformHalfLength; offset >= -platformHalfLength; offset -= segmentStep) {
      const segWorldDist = station.distanceMeters + offset;
      const segDistTo = segWorldDist - physics.distanceMeters;

      if (segDistTo <= 4 || segDistTo > 640) continue;

      const z = 1 - segDistTo / 640;
      const scale = Math.pow(z, 2.3);
      const groundY = horizonY + (h - horizonY) * scale;
      const curveOffset = physics.currentCurvature * (1 - z) * 180;

      // Platform coordinate on right side
      const rightPlatX = cx + curveOffset + (195 * scale);
      // Secondary platform coordinate on left side
      const leftPlatX = cx + curveOffset - (195 * scale);

      const segWidth = 145 * scale;
      const segHeight = Math.max(3, 24 * scale);

      // A. RIGHT PLATFORM CONCRETE SLAB
      ctx.fillStyle = '#64748b'; // Platform deck
      ctx.fillRect(rightPlatX, groundY - segHeight, segWidth, segHeight);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.strokeRect(rightPlatX, groundY - segHeight, segWidth, segHeight);

      // Yellow tactile safety curb strip
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(rightPlatX, groundY - segHeight, 14 * scale, segHeight);

      // B. LEFT PLATFORM CONCRETE SLAB
      ctx.fillStyle = '#64748b';
      ctx.fillRect(leftPlatX - segWidth, groundY - segHeight, segWidth, segHeight);
      ctx.strokeRect(leftPlatX - segWidth, groundY - segHeight, segWidth, segHeight);
      // Yellow tactile strip on left platform edge facing rails
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(leftPlatX - 14 * scale, groundY - segHeight, 14 * scale, segHeight);

      // C. MULTI-BAY VAULTED CANOPY (Covering central 160m from -80 to +80)
      if (Math.abs(offset) <= 80 && scale > 0.12) {
        drawPlatformCanopyBay(ctx, rightPlatX, groundY - segHeight, segWidth, scale);
      }

      // D. PLATFORM AMBER GLOBE LANTERNS (Every 40m)
      if (Math.abs(offset % 40) < 5 && scale > 0.15) {
        drawPlatformLantern(ctx, rightPlatX + 35 * scale, groundY - segHeight, scale);
        drawPlatformLantern(ctx, leftPlatX - 35 * scale, groundY - segHeight, scale);
      }

      // E. PASSENGER BENCHES & LUGGAGE CARTS (At specific offsets)
      if (offset === 40 && scale > 0.2) {
        drawLuggageCart(ctx, rightPlatX + 60 * scale, groundY - segHeight, scale);
      }
      if (offset === -40 && scale > 0.2) {
        drawPlatformBench(ctx, rightPlatX + 70 * scale, groundY - segHeight, scale);
      }

      // F. PASSENGER GROUPS DISTRIBUTED ALONG PLATFORM
      if (Math.abs(offset) <= 90 && Math.abs(offset % 30) < 5 && scale > 0.18) {
        const groupCount = 3 + Math.floor(Math.abs(Math.sin(offset)) * 5);
        drawPlatformPassengers(ctx, rightPlatX + 25 * scale, groundY - segHeight, groupCount, scale);
      }
    }

    // 3. GRAND MAIN STATION TERMINAL BUILDING (Located at station center offset -10m)
    const depotDistTo = (station.distanceMeters - 10) - physics.distanceMeters;
    if (depotDistTo > 6 && depotDistTo < 600) {
      const z = 1 - depotDistTo / 600;
      const scale = Math.pow(z, 2.3);
      const groundY = horizonY + (h - horizonY) * scale;
      const curveOffset = physics.currentCurvature * (1 - z) * 180;
      const depotX = cx + curveOffset + (320 * scale);

      drawGrandStationBuilding(ctx, depotX, groundY, scale, station.name, station.sceneryType);
    }

    // 4. OVERHEAD PEDESTRIAN FOOTBRIDGE (Spans across tracks at offset -35m)
    const bridgeDistTo = (station.distanceMeters - 35) - physics.distanceMeters;
    if (bridgeDistTo > 8 && bridgeDistTo < 520) {
      const z = 1 - bridgeDistTo / 520;
      const scale = Math.pow(z, 2.3);
      const groundY = horizonY + (h - horizonY) * scale;
      const curveOffset = physics.currentCurvature * (1 - z) * 180;
      const trackMidX = cx + curveOffset;

      drawPedestrianFootbridge(ctx, trackMidX, groundY, scale);
    }

    // 5. CRITICAL PASSENGER STOPPING TARGET BOX (Centered around station.distanceMeters)
    if (Math.abs(centerDistTo) < 140) {
      const z = Math.max(0.05, 1 - Math.abs(centerDistTo) / 140);
      const scale = Math.pow(z, 2.3);
      const groundY = horizonY + (h - horizonY) * scale;
      const curveOffset = physics.currentCurvature * (1 - z) * 180;

      // Platform stop target on right side
      const targetPlatX = cx + curveOffset + (195 * scale);

      // Bold yellow/black cross-hatched STOP BOX painted on platform
      ctx.fillStyle = '#eab308';
      ctx.fillRect(targetPlatX - 10 * scale, groundY - 26 * scale, 120 * scale, 26 * scale);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, 4 * scale);
      ctx.strokeRect(targetPlatX - 10 * scale, groundY - 26 * scale, 120 * scale, 26 * scale);

      // Overhead illuminated STOP DIAMOND SIGN
      const markerScale = Math.min(1.4, scale * 1.5);
      const stopMarkerX = cx + curveOffset + (160 * scale);
      const stopMarkerY = groundY - 60 * markerScale;

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(stopMarkerX, stopMarkerY - 24 * markerScale);
      ctx.lineTo(stopMarkerX + 24 * markerScale, stopMarkerY);
      ctx.lineTo(stopMarkerX, stopMarkerY + 24 * markerScale);
      ctx.lineTo(stopMarkerX - 24 * markerScale, stopMarkerY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.max(8, 12 * markerScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', stopMarkerX, stopMarkerY);

      // Digital Platform Info Display
      if (scale > 0.3) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(targetPlatX + 20 * scale, groundY - 105 * scale, 130 * scale, 28 * scale);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(targetPlatX + 20 * scale, groundY - 105 * scale, 130 * scale, 28 * scale);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(7, 10 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('STOPPING ZONE', targetPlatX + 85 * scale, groundY - 92 * scale);
        ctx.fillStyle = '#fde047';
        ctx.font = `bold ${Math.max(6, 8 * scale)}px monospace`;
        ctx.fillText(`OFFSET: ${centerDistTo > 0 ? '+' : ''}${Math.round(centerDistTo)}m`, targetPlatX + 85 * scale, groundY - 82 * scale);
      }
    }
  });
}

function drawAdvanceStationSign(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  cx: number,
  curve: number,
  distTo: number,
  stationName: string,
  distanceBoardNum: number
) {
  const z = 1 - distTo / 360;
  const scale = Math.pow(z, 2.3);
  const groundY = horizonY + (h - horizonY) * scale;
  const signX = cx + curve * (1 - z) * 180 + (220 * scale);

  const signW = 100 * scale;
  const signH = 45 * scale;
  const postH = 110 * scale;

  // Post
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(signX, groundY);
  ctx.lineTo(signX, groundY - postH);
  ctx.stroke();

  // Yellow warning board
  ctx.fillStyle = '#eab308';
  ctx.fillRect(signX - signW / 2, groundY - postH, signW, signH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1.5, 3 * scale);
  ctx.strokeRect(signX - signW / 2, groundY - postH, signW, signH);

  if (scale > 0.25) {
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.max(7, 9 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${distanceBoardNum}m STATION`, signX, groundY - postH + 16 * scale);
    ctx.font = `bold ${Math.max(6, 8 * scale)}px sans-serif`;
    ctx.fillText('SLOW TO 40 KM/H', signX, groundY - postH + 32 * scale);
  }
}

function drawPlatformCanopyBay(
  ctx: CanvasRenderingContext2D,
  platX: number,
  platY: number,
  platW: number,
  scale: number
) {
  const canopyH = 75 * scale;
  const pillarX1 = platX + 25 * scale;
  const pillarX2 = platX + platW - 20 * scale;

  // Steel Pillars
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(2, 5 * scale);
  ctx.beginPath();
  ctx.moveTo(pillarX1, platY);
  ctx.lineTo(pillarX1, platY - canopyH);
  ctx.moveTo(pillarX2, platY);
  ctx.lineTo(pillarX2, platY - canopyH);
  ctx.stroke();

  // Vaulted Arched Roof
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(platX, platY - canopyH);
  ctx.quadraticCurveTo(platX + platW * 0.5, platY - canopyH - 24 * scale, platX + platW + 15 * scale, platY - canopyH);
  ctx.lineTo(platX + platW + 15 * scale, platY - canopyH + 8 * scale);
  ctx.quadraticCurveTo(platX + platW * 0.5, platY - canopyH - 16 * scale, platX, platY - canopyH + 8 * scale);
  ctx.closePath();
  ctx.fill();

  // Glass skylight tint
  ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.fillRect(platX + 15 * scale, platY - canopyH - 12 * scale, platW - 20 * scale, 10 * scale);
}

function drawPlatformLantern(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const poleH = 65 * scale;
  // Black cast-iron pole
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1.5, 3 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - poleH);
  ctx.stroke();

  // Glowing amber lamp globe
  const globeRadius = Math.max(2, 6 * scale);
  const lampY = y - poleH;

  const glow = ctx.createRadialGradient(x, lampY, 1, x, lampY, globeRadius * 3);
  glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
  glow.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, lampY, globeRadius * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(x, lampY, globeRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatformBench(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const benchW = 35 * scale;
  const benchH = 14 * scale;
  ctx.fillStyle = '#065f46'; // Classic dark green station bench
  ctx.fillRect(x, y - benchH, benchW, benchH);
  ctx.strokeStyle = '#022c22';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeRect(x, y - benchH, benchW, benchH);
}

function drawLuggageCart(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const cartW = 40 * scale;
  const cartH = 18 * scale;
  // Wood cart base
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x, y - 8 * scale, cartW, 6 * scale);
  // Wheels
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(x + 8 * scale, y - 3 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.arc(x + cartW - 8 * scale, y - 3 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  // Piled leather suitcases
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(x + 4 * scale, y - 8 * scale - cartH, 22 * scale, 12 * scale);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(x + 18 * scale, y - 8 * scale - cartH * 0.8, 18 * scale, 10 * scale);
}

function drawGrandStationBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  name: string,
  style: string
) {
  const buildingW = 220 * scale;
  const buildingH = 160 * scale;

  // Main Terminal Hall Body
  const wallColor = style === 'town' ? '#475569' : '#334155';
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y - buildingH, buildingW, buildingH);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.strokeRect(x, y - buildingH, buildingW, buildingH);

  // Pitched Gabled Slate Roof
  ctx.fillStyle = '#991b1b'; // Red tile or dark slate
  ctx.beginPath();
  ctx.moveTo(x - 12 * scale, y - buildingH);
  ctx.lineTo(x + buildingW * 0.5, y - buildingH - 65 * scale);
  ctx.lineTo(x + buildingW + 12 * scale, y - buildingH);
  ctx.closePath();
  ctx.fill();

  // Grand Clock Tower
  const towerW = 48 * scale;
  const towerH = 110 * scale;
  const towerX = x + buildingW * 0.5 - towerW / 2;
  const towerY = y - buildingH - 65 * scale - towerH;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(towerX, towerY, towerW, towerH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(towerX, towerY, towerW, towerH);

  // Copper Spire on Tower
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.moveTo(towerX - 4 * scale, towerY);
  ctx.lineTo(towerX + towerW * 0.5, towerY - 50 * scale);
  ctx.lineTo(towerX + towerW + 4 * scale, towerY);
  ctx.closePath();
  ctx.fill();

  // Clock Face
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(towerX + towerW * 0.5, towerY + 35 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arched Windows in Terminal
  const winW = 20 * scale;
  const winH = 34 * scale;
  ctx.fillStyle = '#fef08a';
  for (let w = 0; w < 4; w++) {
    const wx = x + 25 * scale + w * 48 * scale;
    const wy = y - buildingH * 0.65;
    ctx.beginPath();
    ctx.roundRect(wx, wy, winW, winH, [8 * scale, 8 * scale, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Grand Entrance Portals
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(x + buildingW * 0.5 - 28 * scale, y - 55 * scale, 56 * scale, 55 * scale, [14 * scale, 14 * scale, 0, 0]);
  ctx.fill();

  // Grand Station Name Board Banner
  if (scale > 0.22) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 15 * scale, y - buildingH - 18 * scale, buildingW - 30 * scale, 28 * scale);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 15 * scale, y - buildingH - 18 * scale, buildingW - 30 * scale, 28 * scale);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.max(8, 13 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), x + buildingW * 0.5, y - buildingH + 1 * scale);
  }
}

function drawPedestrianFootbridge(
  ctx: CanvasRenderingContext2D,
  trackMidX: number,
  y: number,
  scale: number
) {
  const bridgeSpanW = 420 * scale;
  const clearanceH = 150 * scale;
  const bridgeDeckH = 38 * scale;
  const bx = trackMidX - bridgeSpanW / 2;
  const by = y - clearanceH;

  // Left & Right Support Towers / Stairwells
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(bx, y - clearanceH, 35 * scale, clearanceH);
  ctx.fillRect(bx + bridgeSpanW - 35 * scale, y - clearanceH, 35 * scale, clearanceH);

  // Enclosed Glass & Steel Bridge Corridor
  ctx.fillStyle = '#334155';
  ctx.fillRect(bx, by, bridgeSpanW, bridgeDeckH);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.strokeRect(bx, by, bridgeSpanW, bridgeDeckH);

  // Glass observation windows spanning over track
  ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
  const winCount = 10;
  const winStep = (bridgeSpanW - 80 * scale) / winCount;
  for (let i = 0; i < winCount; i++) {
    ctx.fillRect(bx + 40 * scale + i * winStep + 2 * scale, by + 6 * scale, winStep - 5 * scale, bridgeDeckH - 12 * scale);
  }

  // Steel Lattice Cross Trusses underneath
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = Math.max(1.5, 3 * scale);
  for (let i = 0; i < winCount; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + 40 * scale + i * winStep, by + bridgeDeckH);
    ctx.lineTo(bx + 40 * scale + (i + 1) * winStep, by + bridgeDeckH + 14 * scale);
    ctx.stroke();
  }
}

function drawPlatformPassengers(
  ctx: CanvasRenderingContext2D,
  startX: number,
  y: number,
  count: number,
  scale: number
) {
  if (scale < 0.15) return;
  const numToDraw = Math.min(10, Math.max(2, count));
  const spacing = 9 * scale;
  const clothes = ['#0284c7', '#dc2626', '#475569', '#d97706', '#16a34a', '#7c3aed'];

  for (let p = 0; p < numToDraw; p++) {
    const px = startX + p * spacing;
    const personH = 26 * scale;
    const color = clothes[p % clothes.length];

    ctx.fillStyle = color;
    ctx.fillRect(px - 3 * scale, y - personH * 0.75, 6 * scale, personH * 0.75);

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(px, y - personH * 0.88, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Luggage suitcase for some passengers
    if (p % 2 === 0) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px + 4 * scale, y - 8 * scale, 5 * scale, 8 * scale);
    }
  }
}

function drawWeatherAmbiance(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  time: number,
  headlightMode: HeadlightMode
) {
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 170; i++) {
      const rx = (Math.sin(i * 19 + time * 0.002) * 0.5 + 0.5) * w;
      const ry = ((i * 47 + time * 0.9) % h);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 6, ry + 26);
    }
    ctx.stroke();

    // Dark rain atmosphere
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.fillRect(0, 0, w, h);
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 140; i++) {
      const sx = ((i * 61 + Math.sin(time * 0.001 + i) * 60) % w);
      const sy = ((i * 37 + time * 0.18) % h);
      const size = 1.5 + (i % 3);
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather === 'fog') {
    // Volumetric dense fog obscurity - depends heavily on headlightMode!
    let fogOpacity = 0.65; // Off = heavy obscurity
    if (headlightMode === 'low') {
      fogOpacity = 0.42; // Low beam = partial penetration
    } else if (headlightMode === 'high') {
      fogOpacity = 0.18; // High beam = powerful penetration
    }

    ctx.fillStyle = `rgba(203, 213, 225, ${fogOpacity})`;
    ctx.fillRect(0, h * 0.36, w, h * 0.64);

    // If headlights are OFF in dense fog, show a warning
    if (headlightMode === 'off') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(w * 0.5 - 160, h * 0.28, 320, 32);
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.5 - 160, h * 0.28, 320, 32);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ DENSE FOG: SWITCH TO HIGH BEAM [L]', w * 0.5, h * 0.28 + 16);
    }
  }
}

function drawExternalTrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  physics: TrainPhysicsState,
  time: number,
  headlightMode: HeadlightMode,
  hornActive: boolean
) {
  const cx = w * 0.5;
  const trainBaseY = h * 0.86;
  const locoW = 280;
  const locoH = 190;
  const locoX = cx - locoW / 2;
  const locoY = trainBaseY - locoH;

  // Wheel bogies & trucks
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(locoX + 35, trainBaseY - 30, locoW - 70, 26);
  const wheels = [locoX + 50, locoX + 85, locoX + locoW - 85, locoX + locoW - 50];
  ctx.fillStyle = '#78716c';
  wheels.forEach((wx) => {
    ctx.beginPath();
    ctx.arc(wx, trainBaseY - 14, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 4;
    ctx.stroke();
  });

  // Locomotive Body
  const locoGrad = ctx.createLinearGradient(locoX, locoY, locoX + locoW, locoY);
  locoGrad.addColorStop(0, '#dc2626');
  locoGrad.addColorStop(0.35, '#b91c1c');
  locoGrad.addColorStop(0.7, '#991b1b');
  locoGrad.addColorStop(1, '#7f1d1d');

  ctx.fillStyle = locoGrad;
  ctx.beginPath();
  ctx.roundRect(locoX, locoY, locoW, locoH - 25, [32, 32, 8, 8]);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(locoX, locoY + locoH * 0.5, locoW, 16);

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(locoX + 25, locoY - 18, locoW - 50, 22, [10, 10, 0, 0]);
  ctx.fill();

  // Driver Windshield
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(locoX + 45, locoY + 28, locoW - 90, 48, [12, 12, 4, 4]);
  ctx.fill();

  // Twin Headlights with intensity modes
  if (headlightMode !== 'off') {
    const isHigh = headlightMode === 'high';
    const light1X = locoX + 50;
    const light2X = locoX + locoW - 50;
    const lightY = locoY + locoH - 52;

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(light1X, lightY, isHigh ? 11 : 8, 0, Math.PI * 2);
    ctx.arc(light2X, lightY, isHigh ? 11 : 8, 0, Math.PI * 2);
    ctx.fill();

    const glowRadius = isHigh ? 45 : 25;
    const glow = ctx.createRadialGradient(light1X, lightY, 3, light1X, lightY, glowRadius);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(light1X, lightY, glowRadius, 0, Math.PI * 2);
    ctx.arc(light2X, lightY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hornActive) {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
    ctx.lineWidth = 3;
    for (let r = 20; r <= 60; r += 20) {
      ctx.beginPath();
      ctx.arc(locoX + locoW * 0.5, locoY - 20, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
}

function drawCabWindshield(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weather: WeatherType,
  wiperMode: WiperMode,
  windshieldMoisture: number,
  time: number
) {
  const pillarW = 55;
  const topPillarH = 50;
  const bottomConsoleH = 15;

  // 1. WINDSHIELD MOISTURE / RAIN / SNOW BLUR OVERLAY
  if (windshieldMoisture > 5) {
    const blurAlpha = Math.min(0.68, (windshieldMoisture / 100) * 0.68);
    ctx.fillStyle = `rgba(203, 213, 225, ${blurAlpha})`;
    ctx.fillRect(pillarW, topPillarH, w - pillarW * 2, h * 0.72);

    // Hundreds of water droplets & smears on glass
    const dropCount = Math.floor((windshieldMoisture / 100) * 120);
    ctx.fillStyle = weather === 'snow' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.45)';
    for (let d = 0; d < dropCount; d++) {
      const dx = ((d * 97) % (w - 180)) + 90;
      const dy = ((d * 53 + time * 0.04) % (h * 0.65)) + topPillarH + 15;
      const size = 2 + (d % 4);
      ctx.beginPath();
      ctx.arc(dx, dy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // High moisture warning badge if wipers are OFF
    if (windshieldMoisture > 60 && wiperMode === 'off') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(w * 0.5 - 180, topPillarH + 30, 360, 34);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.5 - 180, topPillarH + 30, 360, 34);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ VISIBILITY IMPAIRED · TURN ON WIPERS [P]', w * 0.5, topPillarH + 47);
    }
  }

  // 2. CABIN WINDSHIELD PILLARS & CONSOLE FRAME
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, topPillarH);

  // Left pillar
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(pillarW, topPillarH);
  ctx.lineTo(pillarW + 20, h - bottomConsoleH);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Right pillar
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - pillarW, topPillarH);
  ctx.lineTo(w - pillarW - 20, h - bottomConsoleH);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Center windshield divider
  const centerW = 24;
  ctx.fillRect(w * 0.5 - centerW / 2, topPillarH, centerW, h * 0.7);

  // 3. ANIMATED WIPERS (Off, Intermittent, High)
  const wiperBaseY = h * 0.72;
  const wiperBaseX1 = w * 0.32;
  const wiperBaseX2 = w * 0.68;
  const wiperLen = 220;

  let isWiping = false;
  let sweepAngle = -Math.PI / 4; // Parked angle

  if (wiperMode === 'high') {
    isWiping = true;
    sweepAngle = Math.sin(time * 0.007) * (Math.PI / 3.2);
  } else if (wiperMode === 'intermittent') {
    // Cycles every 2.4s: sweeps for 1.2s then pauses
    const cycle = (time * 0.001) % 2.4;
    if (cycle < 1.2) {
      isWiping = true;
      sweepAngle = Math.sin((cycle / 1.2) * Math.PI * 2) * (Math.PI / 3.2);
    }
  }

  // Draw the two physical wiper blades
  [wiperBaseX1, wiperBaseX2].forEach((bx) => {
    ctx.save();
    ctx.translate(bx, wiperBaseY);
    ctx.rotate(sweepAngle);

    // Wiper steel arm
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -wiperLen);
    ctx.stroke();

    // Rubber squeegee blade
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, -wiperLen);
    ctx.lineTo(12, -wiperLen);
    ctx.stroke();

    // Pivot cap
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

