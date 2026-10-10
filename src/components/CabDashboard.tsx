import { TrainPhysicsState, WeatherType, HeadlightMode, WiperMode } from '../types/game';
import { MechanicalLever } from './MechanicalLever';
import {
  Volume2,
  VolumeX,
  Sun,
  CloudRain,
  CloudFog,
  Snowflake,
  Sunset,
} from 'lucide-react';

interface CabDashboardProps {
  physics: TrainPhysicsState;
  speedLimitKmh: number;
  weather: WeatherType;
  wiperMode: WiperMode;
  headlightMode: HeadlightMode;
  windshieldMoisture: number;
  hornActive: boolean;
  isMuted: boolean;
  onSetThrottle: (val: number) => void;
  onSetBrake: (val: number) => void;
  onToggleReverser: () => void;
  onEmergencyBrake: () => void;
  onCycleWipers: () => void;
  onCycleHeadlights: () => void;
  onStartHorn: () => void;
  onStopHorn: () => void;
  onToggleMute: () => void;
  onChangeWeather: (w: WeatherType) => void;
}

export const CabDashboard: React.FC<CabDashboardProps> = ({
  physics,
  speedLimitKmh,
  weather,
  wiperMode,
  headlightMode,
  windshieldMoisture,
  hornActive,
  isMuted,
  onSetThrottle,
  onSetBrake,
  onToggleReverser,
  onEmergencyBrake,
  onCycleWipers,
  onCycleHeadlights,
  onStartHorn,
  onStopHorn,
  onToggleMute,
  onChangeWeather,
}) => {
  const isOverSpeed = physics.speedKmh > speedLimitKmh + 1.5;

  // Speedometer needle rotation (-135 deg to +135 deg for 0 - 140 km/h)
  const speedNormalized = Math.min(140, Math.max(0, Math.abs(physics.speedKmh))) / 140;
  const speedAngle = -135 + speedNormalized * 270;

  // Speed limit marker angle
  const limitNormalized = Math.min(140, speedLimitKmh) / 140;
  const limitAngle = -135 + limitNormalized * 270;

  // Brake pipe angle: 5.0 bar (normal release) = +90 deg, 0 bar = -90 deg
  const bpAngle = -90 + (physics.brakePipePressureBar / 5.0) * 180;
  const bcAngle = -90 + (physics.brakeCylinderPressureBar / 3.8) * 180;

  // Throttle trigger notches
  const throttleNotches = [
    { label: 'MAX', value: 100 },
    { label: 'N6', value: 75 },
    { label: 'N4', value: 50 },
    { label: 'N2', value: 25 },
    { label: 'IDLE', value: 0 },
  ];

  // Brake trigger notches
  const brakeNotches = [
    { label: 'EMG', value: 100 },
    { label: 'FULL', value: 75 },
    { label: 'SRV', value: 50 },
    { label: 'MIN', value: 25 },
    { label: 'REL', value: 0 },
  ];

  return (
    <footer className="w-full bg-slate-950/95 border-t border-slate-800/90 px-3 py-2.5 select-none text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* SEPARATE MECHANICAL LEVER 1: THROTTLE (LEFT SIDE) */}
        <div className="w-full md:w-72 shrink-0">
          <MechanicalLever
            type="THROTTLE"
            value={physics.throttlePercent}
            actualValue={physics.actualThrottle}
            unitLabel="RPM"
            onChange={onSetThrottle}
          />
        </div>

        {/* CENTER CONSOLE: ANALOG SPEEDOMETER, AIR GAUGE, HORN & AUX SWITCHES */}
        <div className="flex-1 w-full bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-around gap-4">
          {/* SPEEDOMETER DIAL */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 rounded-full bg-slate-950 border-2 border-slate-700 shadow-inner flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                />
                {/* Speed limit needle indicator */}
                <line
                  x1="50"
                  y1="50"
                  x2={50 + 40 * Math.cos(((limitAngle - 90) * Math.PI) / 180)}
                  y2={50 + 40 * Math.sin(((limitAngle - 90) * Math.PI) / 180)}
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray="2,2"
                />
              </svg>

              {/* Speed Needle */}
              <div
                className="absolute w-1 h-12 bg-white origin-bottom rounded-full transition-transform duration-75 shadow"
                style={{
                  transform: `translateY(-24px) rotate(${speedAngle}deg)`,
                }}
              />

              {/* Center Cap */}
              <div className="absolute w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 z-10" />

              {/* Digital Readout inside Dial */}
              <div className="absolute bottom-3 text-center">
                <span
                  className={`text-base font-bold font-mono tabular-nums leading-none ${
                    isOverSpeed ? 'text-rose-400 animate-pulse' : 'text-slate-100'
                  }`}
                >
                  {Math.round(Math.abs(physics.speedKmh))}
                </span>
                <span className="block text-[8px] text-slate-400 uppercase font-mono">
                  KM/H
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
              Speedometer
            </span>
          </div>

          {/* DUPLEX AIR PRESSURE & TRACTIVE EFFORT */}
          <div className="flex items-center gap-3">
            {/* Air Pressure */}
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full bg-slate-950 border-2 border-slate-700 shadow-inner flex items-center justify-center">
                <div
                  className="absolute w-0.5 h-8 bg-cyan-400 origin-bottom rounded-full transition-transform duration-100"
                  style={{ transform: `translateY(-16px) rotate(${bpAngle}deg)` }}
                />
                <div
                  className="absolute w-0.5 h-8 bg-rose-400 origin-bottom rounded-full transition-transform duration-100"
                  style={{ transform: `translateY(-16px) rotate(${bcAngle}deg)` }}
                />
                <div className="absolute w-3 h-3 rounded-full bg-slate-700 border border-slate-500 z-10" />
                <div className="absolute bottom-2 text-center text-[9px] font-mono text-slate-400">
                  <span className="text-cyan-400">{physics.brakePipePressureBar.toFixed(1)}</span> /{' '}
                  <span className="text-rose-400">{physics.brakeCylinderPressureBar.toFixed(1)}</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                Air Brake
              </span>
            </div>

            {/* Tractive Force */}
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full bg-slate-950 border-2 border-slate-700 shadow-inner flex flex-col items-center justify-center p-1">
                <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                  {Math.round(physics.tractiveForceKn)}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">kN</span>
                {physics.wheelSlip && (
                  <span className="text-[8px] font-bold text-amber-400 animate-pulse mt-0.5">
                    SLIP!
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                Traction
              </span>
            </div>
          </div>

          {/* SWITCHES & HORN */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={onToggleReverser}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                  physics.reverser === 1
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-600 text-amber-300'
                }`}
              >
                {physics.reverser === 1 ? 'FWD' : 'REV'}
              </button>

              <button
                onClick={onCycleWipers}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold border transition-colors truncate ${
                  wiperMode === 'high'
                    ? 'bg-cyan-900 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : wiperMode === 'intermittent'
                    ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Wiper Mode: OFF / INTERMITTENT / HIGH [P]"
              >
                Wipers: {wiperMode === 'intermittent' ? 'INT' : wiperMode.toUpperCase()}
              </button>

              <button
                onClick={onCycleHeadlights}
                className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold border transition-colors truncate ${
                  headlightMode === 'high'
                    ? 'bg-amber-900 border-amber-300 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                    : headlightMode === 'low'
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Headlight Intensity: OFF / LOW BEAM / HIGH BEAM [L]"
              >
                Lights: {headlightMode.toUpperCase()}
              </button>
            </div>

            {/* Windshield Moisture Alert Bar if raining/snowing */}
            {windshieldMoisture > 8 && (
              <div className="flex items-center justify-between text-[10px] font-mono px-1 py-0.5 bg-slate-950/70 rounded border border-slate-800">
                <span className="text-slate-400">Glass Moisture:</span>
                <span
                  className={`font-bold tabular-nums ${
                    windshieldMoisture > 60
                      ? 'text-rose-400 animate-pulse'
                      : windshieldMoisture > 30
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {Math.round(windshieldMoisture)}% {windshieldMoisture > 60 ? '· BLURRED!' : ''}
                </span>
              </div>
            )}

            {/* Horn and Emergency Mushroom */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onMouseDown={onStartHorn}
                onMouseUp={onStopHorn}
                onTouchStart={onStartHorn}
                onTouchEnd={onStopHorn}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm transition-all ${
                  hornActive
                    ? 'bg-amber-500 border-amber-400 text-slate-950 scale-95'
                    : 'bg-amber-600/30 border-amber-600/60 text-amber-300 hover:bg-amber-600/40'
                }`}
              >
                Horn [H]
              </button>

              <button
                onClick={onEmergencyBrake}
                className={`py-2 px-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${
                  physics.emergencyBrakeActive
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-rose-900/60 border-rose-700/80 text-rose-300 hover:bg-rose-800/80'
                }`}
              >
                Emergency [E]
              </button>
            </div>

            {/* Weather & Mute */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1">
                {[
                  { type: 'clear' as WeatherType, icon: Sun, label: 'Sunny' },
                  { type: 'rain' as WeatherType, icon: CloudRain, label: 'Rain' },
                  { type: 'fog' as WeatherType, icon: CloudFog, label: 'Mist' },
                  { type: 'snow' as WeatherType, icon: Snowflake, label: 'Snow' },
                  { type: 'sunset' as WeatherType, icon: Sunset, label: 'Sunset' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => onChangeWeather(type)}
                    className={`p-1.5 rounded transition-colors ${
                      weather === type
                        ? 'bg-slate-700 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Weather: ${label}`}
                    aria-label={`Weather: ${label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <button
                onClick={onToggleMute}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* SEPARATE MECHANICAL LEVER 2: BRAKE (RIGHT SIDE) */}
        <div className="w-full md:w-72 shrink-0">
          <MechanicalLever
            type="BRAKE"
            value={physics.brakePercent}
            actualValue={physics.brakePipePressureBar}
            unitLabel="B.P."
            onChange={onSetBrake}
            isEmergencyActive={physics.emergencyBrakeActive}
          />
        </div>
      </div>
    </footer>
  );
};
