import {
  CameraView,
  SemaphoreData,
  StationData,
  SpeedLimitSign,
  WeatherType,
  HeadlightMode,
  WiperMode,
} from '../types/game';
import {
  ShieldAlert,
  Camera,
  Compass,
  HelpCircle,
  RotateCcw,
  CloudRain,
  CloudFog,
  Snowflake,
  Sun,
  Sunset,
  AlertTriangle,
} from 'lucide-react';

interface HUDProps {
  safetyPoints: number; // 0 to 10
  currentSpeedKmh: number;
  speedLimitKmh: number;
  distanceKm: number;
  nextStation: { station: StationData; distanceTo: number } | null;
  nextSemaphore: { semaphore: SemaphoreData; distanceTo: number } | null;
  cameraView: CameraView;
  gradientPercent: number;
  weather: WeatherType;
  weatherAlert: string | null;
  headlightMode: HeadlightMode;
  wiperMode: WiperMode;
  windshieldMoisture: number;
  onSetCameraView: (view: CameraView) => void;
  onOpenHelp: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  safetyPoints,
  currentSpeedKmh,
  speedLimitKmh,
  distanceKm,
  nextStation,
  nextSemaphore,
  cameraView,
  gradientPercent,
  weather,
  weatherAlert,
  headlightMode,
  wiperMode,
  windshieldMoisture,
  onSetCameraView,
  onOpenHelp,
  onRestart,
}) => {
  const isOverSpeed = currentSpeedKmh > speedLimitKmh + 2;
  const isDangerZone = safetyPoints <= 3;

  // Determine weather equipment warnings
  const wipersNeeded = (weather === 'rain' || weather === 'snow') && wiperMode === 'off';
  const highBeamNeeded = weather === 'fog' && headlightMode !== 'high';

  return (
    <header className="absolute top-0 inset-x-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 select-none text-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* BRAND & SAFETY LICENSE POINTS */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white text-base">
              IronRail
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Alpine Express
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" aria-hidden="true" />

          {/* SAFETY LICENSE POINTS (10 START) */}
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={`w-4 h-4 ${
                isDangerZone
                  ? 'text-rose-500 animate-bounce'
                  : safetyPoints < 7
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-semibold text-slate-400">SAFETY:</span>
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  isDangerZone
                    ? 'text-rose-400'
                    : safetyPoints < 7
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {safetyPoints}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">/ 10 PTS</span>
            </div>
          </div>
        </div>

        {/* CENTER TELEMETRY & FLIGHT STRIP */}
        <div className="hidden lg:flex items-center gap-5 text-xs">
          {/* SPEED STATUS */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">SPD:</span>
            <span
              className={`font-bold tabular-nums ${
                isOverSpeed ? 'text-rose-400 animate-pulse' : 'text-slate-100'
              }`}
            >
              {Math.round(currentSpeedKmh)}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-amber-300 tabular-nums">{speedLimitKmh} km/h</span>
            {isOverSpeed && (
              <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider ml-1">
                Overspeed!
              </span>
            )}
          </div>

          <span className="text-slate-700" aria-hidden="true">·</span>

          {/* NEXT SEMAPHORE */}
          {nextSemaphore ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">SIG:</span>
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  nextSemaphore.semaphore.aspect === 'green'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : nextSemaphore.semaphore.aspect === 'yellow'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                }`}
              />
              <span className="font-mono tabular-nums text-slate-300">
                {Math.round(nextSemaphore.distanceTo)}m
              </span>
              <span className="text-[11px] text-slate-400 uppercase">
                {nextSemaphore.semaphore.aspect === 'green'
                  ? 'Clear'
                  : nextSemaphore.semaphore.aspect === 'yellow'
                  ? 'Caution 40'
                  : 'DANGER STOP'}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">End of Line</span>
          )}

          <span className="text-slate-700" aria-hidden="true">·</span>

          {/* NEXT STATION */}
          {nextStation ? (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">NEXT:</span>
              <span className="text-slate-200 font-medium">
                {nextStation.station.name}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-cyan-300 tabular-nums">
                {Math.round(nextStation.distanceTo)}m
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Route Complete</span>
          )}

          <span className="text-slate-700" aria-hidden="true">·</span>

          {/* TRACK GRADIENT */}
          <div className="flex items-center gap-1 font-mono text-slate-400">
            <span>GRADE:</span>
            <span
              className={`tabular-nums ${
                gradientPercent > 0
                  ? 'text-amber-400'
                  : gradientPercent < 0
                  ? 'text-cyan-400'
                  : 'text-slate-300'
              }`}
            >
              {gradientPercent > 0 ? `+${gradientPercent.toFixed(1)}%` : `${gradientPercent.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* RIGHT CONTROLS: CAMERA VIEW SWITCHER & ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* CAMERA VIEW SELECTOR */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => onSetCameraView('cab')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                cameraView === 'cab'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cab
            </button>
            <button
              onClick={() => onSetCameraView('chase')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                cameraView === 'chase'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chase
            </button>
            <button
              onClick={() => onSetCameraView('trackside')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                cameraView === 'trackside'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trackside
            </button>
          </div>

          {/* DRIVER GUIDE MODAL */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Driver Rules & Guide"
            aria-label="Driver Rules & Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* RESTART BUTTON */}
          <button
            onClick={onRestart}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Restart Shift"
            aria-label="Restart Shift"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DISPATCH RADIO WEATHER & VISIBILITY ADVISORY STRIP */}
      {(weatherAlert || wipersNeeded || highBeamNeeded || windshieldMoisture > 50) && (
        <div
          className={`mt-2 -mx-4 -mb-2.5 px-4 py-1.5 text-xs font-mono flex items-center justify-between border-t transition-colors ${
            windshieldMoisture > 65 || (weather === 'fog' && headlightMode === 'off')
              ? 'bg-rose-950/90 border-rose-800 text-rose-200 animate-pulse'
              : wipersNeeded || highBeamNeeded
              ? 'bg-amber-950/85 border-amber-800 text-amber-200'
              : 'bg-slate-900/90 border-slate-800 text-cyan-200'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider uppercase text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300">
                DISPATCH RADIO
              </span>
              <span className="truncate">
                {weatherAlert ||
                  (wipersNeeded
                    ? `Heavy precipitation! Glass moisture ${Math.round(windshieldMoisture)}% · Turn on wipers [P]`
                    : highBeamNeeded
                    ? `Dense fog ahead! Switch headlights to HIGH BEAM [L] to pierce fog`
                    : `Reduced visibility: Windshield moisture ${Math.round(windshieldMoisture)}%`)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] shrink-0 font-sans text-slate-300">
              <span className="flex items-center gap-1">
                Wipers:
                <strong
                  className={`font-mono px-1 py-0.5 rounded text-[10px] ${
                    wipersNeeded
                      ? 'bg-rose-900 text-rose-200 font-bold'
                      : wiperMode === 'high'
                      ? 'bg-cyan-900 text-cyan-200'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {wiperMode.toUpperCase()}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                Lights:
                <strong
                  className={`font-mono px-1 py-0.5 rounded text-[10px] ${
                    highBeamNeeded
                      ? 'bg-amber-900 text-amber-200 font-bold'
                      : headlightMode === 'high'
                      ? 'bg-amber-800 text-amber-200'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {headlightMode.toUpperCase()}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

