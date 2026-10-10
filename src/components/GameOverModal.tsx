import React from 'react';
import { ViolationRecord, GameStats } from '../types/game';
import { AlertTriangle, RotateCcw, ShieldOff, Route, Users, Gauge } from 'lucide-react';

interface GameOverModalProps {
  violations: ViolationRecord[];
  stats: GameStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  violations,
  stats,
  onRestart,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-slate-900 border border-rose-900/80 rounded-2xl p-6 shadow-2xl text-slate-200">
        {/* HEADER */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-3 bg-rose-950 border border-rose-800 rounded-xl">
            <ShieldOff className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Zero Safety Points Remaining
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Driving License Revoked
            </h2>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
              <Route className="w-3.5 h-3.5" /> Distance
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
              <Gauge className="w-3.5 h-3.5" /> Top Speed
            </div>
            <div className="font-mono text-base font-bold text-amber-400 tabular-nums">
              {Math.round(stats.maxSpeedAchieved)} km/h
            </div>
          </div>
        </div>

        {/* VIOLATIONS LOG */}
        <div className="my-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Safety Infractions Log ({violations.length})
          </span>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {violations.map((v) => (
              <div
                key={v.id}
                className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-rose-200">{v.description}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    At kilometer {v.locationKm.toFixed(2)}
                  </div>
                </div>
                <span className="font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  -{v.pointsDeducted} PT
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RESTART ACTION */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" /> Start New Shift
          </button>
        </div>
      </div>
    </div>
  );
};
