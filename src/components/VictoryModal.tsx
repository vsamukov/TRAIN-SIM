import React from 'react';
import { GameStats, ViolationRecord } from '../types/game';
import { Trophy, Star, CheckCircle, RotateCcw, Route, Users, ShieldCheck } from 'lucide-react';

interface VictoryModalProps {
  stats: GameStats;
  safetyPoints: number;
  violations: ViolationRecord[];
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  safetyPoints,
  violations,
  onRestart,
}) => {
  const stars = safetyPoints >= 9 ? 3 : safetyPoints >= 6 ? 2 : 1;
  const ratingTitle =
    stars === 3
      ? 'Master Locomotive Engineer'
      : stars === 2
      ? 'Senior Railway Driver'
      : 'Qualified Line Driver';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-slate-900 border border-emerald-700/80 rounded-2xl p-6 shadow-2xl text-slate-200">
        {/* HEADER */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Shift Successfully Completed
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {ratingTitle}
            </h2>
          </div>
        </div>

        {/* STAR RATING */}
        <div className="my-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map((starIndex) => (
              <Star
                key={starIndex}
                className={`w-7 h-7 ${
                  starIndex <= stars
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> Safety Points: {safetyPoints} / 10
          </div>
        </div>

        {/* PERFORMANCE STATS */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
              <Route className="w-3.5 h-3.5" /> Total Line
            </div>
            <div className="font-mono text-base font-bold text-white tabular-nums">
              {stats.totalDistanceKm.toFixed(1)} km
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5" /> Passengers
            </div>
            <div className="font-mono text-base font-bold text-cyan-400 tabular-nums">
              {stats.passengersDelivered}
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5" /> Clean Stops
            </div>
            <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">
              {stats.cleanStations} / 4
            </div>
          </div>
        </div>

        {/* VIOLATIONS IF ANY */}
        {violations.length > 0 && (
          <div className="my-3 text-xs text-slate-400">
            Recorded infractions: {violations.length} (
            {violations.map((v) => v.description).join(', ')}).
          </div>
        )}

        {/* RESTART / REPLAY BUTTON */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" /> Drive Scenic Route Again
          </button>
        </div>
      </div>
    </div>
  );
};
