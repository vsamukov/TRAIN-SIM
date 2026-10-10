import React, { useRef, useState, useCallback } from 'react';
import { soundEngine } from '../utils/audio';
import { ChevronUp, ChevronDown, Zap, ShieldAlert } from 'lucide-react';

interface MechanicalLeverProps {
  type: 'THROTTLE' | 'BRAKE';
  value: number; // 0 to 100
  actualValue?: number; // e.g. actual engine RPM or brake cylinder pressure
  unitLabel?: string;
  onChange: (val: number) => void;
  isEmergencyActive?: boolean;
}

export const MechanicalLever: React.FC<MechanicalLeverProps> = ({
  type,
  value,
  actualValue,
  unitLabel,
  onChange,
  isEmergencyActive,
}) => {
  const isThrottle = type === 'THROTTLE';
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastNotchRef = useRef<number>(Math.round(value / 12.5));

  // Notches
  const throttleNotches = [
    { label: 'MAX', val: 100, notchIndex: 8 },
    { label: 'N7', val: 87.5, notchIndex: 7 },
    { label: 'N6', val: 75, notchIndex: 6 },
    { label: 'N5', val: 62.5, notchIndex: 5 },
    { label: 'N4', val: 50, notchIndex: 4 },
    { label: 'N3', val: 37.5, notchIndex: 3 },
    { label: 'N2', val: 25, notchIndex: 2 },
    { label: 'N1', val: 12.5, notchIndex: 1 },
    { label: 'IDLE', val: 0, notchIndex: 0 },
  ];

  const brakeNotches = [
    { label: 'EMERG', val: 100, notchIndex: 4 },
    { label: 'FULL', val: 75, notchIndex: 3 },
    { label: 'SRV', val: 50, notchIndex: 2 },
    { label: 'MIN', val: 25, notchIndex: 1 },
    { label: 'REL', val: 0, notchIndex: 0 },
  ];

  const notches = isThrottle ? throttleNotches : brakeNotches;

  // Determine current active notch label
  const currentNotchObj = notches.reduce((closest, curr) => {
    return Math.abs(curr.val - value) < Math.abs(closest.val - value) ? curr : closest;
  }, notches[0]);

  // Pointer drag along the vertical quadrant slot
  const handlePointerUpdate = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const height = rect.height;
      const offsetY = clientY - rect.top;
      // Invert: top = 100%, bottom = 0%
      const ratio = 1 - offsetY / height;
      const clamped = Math.max(0, Math.min(100, Math.round(ratio * 100)));

      // Check if crossed a notch for audio click
      const notchStep = isThrottle ? 12.5 : 25;
      const currentNotchIndex = Math.round(clamped / notchStep);
      if (currentNotchIndex !== lastNotchRef.current) {
        lastNotchRef.current = currentNotchIndex;
        soundEngine.playLeverClick();
      }

      onChange(clamped);
    },
    [isThrottle, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    handlePointerUpdate(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handlePointerUpdate(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
    }
  };

  // Step increments
  const stepUp = () => {
    const step = isThrottle ? 12.5 : 25;
    const nextVal = Math.min(100, Math.round((value + step) / step) * step);
    soundEngine.playLeverClick();
    onChange(nextVal);
  };

  const stepDown = () => {
    const step = isThrottle ? 12.5 : 25;
    const nextVal = Math.max(0, Math.round((value - step) / step) * step);
    soundEngine.playLeverClick();
    onChange(nextVal);
  };

  // Lever arm physical tilt angle (-24 deg at 0% to +24 deg at 100%)
  const leverTiltDeg = -24 + (value / 100) * 48;

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border select-none transition-all shadow-2xl backdrop-blur-md ${
        isThrottle
          ? 'bg-slate-900/95 border-amber-500/50 shadow-amber-950/30'
          : isEmergencyActive
          ? 'bg-rose-950/95 border-rose-500 shadow-rose-950/50 animate-pulse'
          : 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/30'
      }`}
    >
      {/* CORNER ALLEN BOLTS FOR INDUSTRIAL LOOK */}
      <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-500" />
      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-500" />
      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-500" />
      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-700 border border-slate-500" />

      {/* LEVER HEADER & NOTCH READOUT */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-800 px-1">
        <div className="flex items-center gap-1.5">
          {isThrottle ? (
            <Zap className="w-4 h-4 text-amber-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span
            className={`text-xs font-black tracking-wider ${
              isThrottle ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {isThrottle ? 'THROTTLE LEVER' : 'AIR BRAKE HANDLE'}
          </span>
        </div>

        {/* CURRENT NOTCH BADGE */}
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
              isThrottle
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
            }`}
          >
            {currentNotchObj.label}
          </span>
          <span
            className={`font-mono text-sm font-black tabular-nums ${
              isThrottle ? 'text-amber-300' : 'text-rose-300'
            }`}
          >
            {Math.round(value)}%
          </span>
        </div>
      </div>

      {/* RPM / PRESSURE TELEMETRY BAR */}
      {actualValue !== undefined && (
        <div className="w-full flex items-center justify-between text-[11px] text-slate-400 py-1 font-mono px-1">
          <span>{unitLabel || 'Actual'}:</span>
          <span
            className={`font-semibold tabular-nums ${
              isThrottle ? 'text-amber-300' : 'text-rose-300'
            }`}
          >
            {isThrottle ? `${Math.round(actualValue)}% RPM` : `${actualValue.toFixed(1)} bar`}
          </span>
        </div>
      )}

      {/* PHYSICAL MECHANICAL LEVER QUADRANT */}
      <div className="relative flex items-center justify-center w-full my-2 h-44 sm:h-48">
        {/* Left Side: Engraved Notch Labels */}
        <div className="absolute left-2 inset-y-0 flex flex-col justify-between py-2 text-[10px] font-mono text-slate-400 pointer-events-none">
          {notches.map((n) => (
            <div key={n.label} className="flex items-center gap-1">
              <div
                className={`w-2 h-0.5 ${
                  Math.abs(value - n.val) < 8
                    ? isThrottle
                      ? 'bg-amber-400 w-3'
                      : 'bg-rose-400 w-3'
                    : 'bg-slate-700'
                }`}
              />
              <span
                className={`leading-none ${
                  Math.abs(value - n.val) < 8
                    ? isThrottle
                      ? 'text-amber-300 font-bold'
                      : 'text-rose-300 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {n.label}
              </span>
            </div>
          ))}
        </div>

        {/* Center: Machined Cast Quadrant Slot & Mechanical Lever Handle */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-20 sm:w-24 h-full bg-slate-950 rounded-2xl border-2 border-slate-700 shadow-inner cursor-ns-resize flex justify-center items-end p-2 overflow-hidden touch-none"
        >
          {/* Steel Quadrant Slot Guide */}
          <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-4 bg-slate-900 border-x border-slate-800 rounded-full" />

          {/* Notch detent teeth cutouts */}
          <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-6 flex flex-col justify-between py-1 pointer-events-none">
            {notches.map((n) => (
              <div
                key={n.val}
                className="w-full h-0.5 bg-slate-800 border-b border-slate-700/60"
              />
            ))}
          </div>

          {/* Illuminated Level Gradient */}
          <div
            className={`absolute bottom-0 inset-x-2 rounded-b-xl transition-all duration-75 pointer-events-none ${
              isThrottle
                ? 'bg-gradient-to-t from-amber-600/40 via-amber-500/20 to-transparent'
                : 'bg-gradient-to-t from-rose-600/40 via-rose-500/20 to-transparent'
            }`}
            style={{ height: `${value}%` }}
          />

          {/* THE PHYSICAL MECHANICAL LEVER ROD & GRIP HANDLE */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 flex flex-col items-center"
            style={{
              bottom: `calc(${value}% - 20px)`,
            }}
          >
            {/* Chrome Steel Lever Arm / Rod */}
            <div
              className="w-3 h-10 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-full border border-slate-600 shadow-md transform origin-bottom transition-transform duration-75"
              style={{
                transform: `rotate(${leverTiltDeg}deg)`,
              }}
            />

            {/* Heavy Textured Mechanical Grip Knob */}
            <div
              className={`w-14 sm:w-16 h-9 rounded-xl border-2 shadow-2xl flex flex-col items-center justify-center transition-all ${
                isThrottle
                  ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-amber-200 text-slate-950 shadow-amber-950/60'
                  : 'bg-gradient-to-b from-rose-300 via-rose-600 to-rose-800 border-rose-200 text-white shadow-rose-950/60'
              }`}
            >
              {/* Grip Ribs & Label */}
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950/80" />
                <span className="text-[9px] font-black tracking-wider uppercase">
                  {isThrottle ? 'THROTTLE' : 'BRAKE'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950/80" />
              </div>
              <div className="w-10 h-0.5 bg-slate-950/60 rounded" />
            </div>
          </div>
        </div>

        {/* Right Side: Step Nudge Buttons */}
        <div className="absolute right-2 flex flex-col gap-2">
          <button
            onClick={stepUp}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 transition-all shadow-md cursor-pointer"
            title={`Step ${isThrottle ? 'Throttle' : 'Brake'} Up`}
            aria-label={`Step ${isThrottle ? 'Throttle' : 'Brake'} Up`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={stepDown}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 transition-all shadow-md cursor-pointer"
            title={`Step ${isThrottle ? 'Throttle' : 'Brake'} Down`}
            aria-label={`Step ${isThrottle ? 'Throttle' : 'Brake'} Down`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUICK NOTCH DETENT BUTTONS ROW */}
      <div className="w-full grid grid-cols-5 gap-1 pt-1.5 border-t border-slate-800 px-1">
        {notches.slice(0, 5).map((n) => (
          <button
            key={n.label}
            onClick={() => {
              soundEngine.playLeverClick();
              onChange(n.val);
            }}
            className={`py-1 text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
              Math.abs(value - n.val) < 6
                ? isThrottle
                  ? 'bg-amber-500/35 border-amber-400 text-amber-200 font-bold shadow-md scale-102'
                  : 'bg-rose-500/35 border-rose-400 text-rose-200 font-bold shadow-md scale-102'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
};
