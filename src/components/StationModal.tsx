import React from 'react';
import { StationStopProgress } from '../types/game';
import { Users, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

interface StationModalProps {
  progress: StationStopProgress;
  onDepartStation: () => void;
}

export const StationModal: React.FC<StationModalProps> = ({
  progress,
  onDepartStation,
}) => {
  const isPerfectStop = Math.abs(progress.offsetMeters) <= 8;
  const isGoodStop = Math.abs(progress.offsetMeters) <= 18;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-4">
      <div className="pointer-events-auto max-w-md w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-5 text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        {/* STATION HEADER */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400">
              Station Docking
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {progress.station.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {progress.station.description}
            </p>
          </div>
          <div className="p-2 bg-slate-800 rounded-xl">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* DOCKING ACCURACY BADGE */}
        <div className="mt-4 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Platform Stop Offset:</span>
            <div className="font-mono text-sm font-bold text-white tabular-nums">
              {progress.offsetMeters > 0 ? `+${progress.offsetMeters.toFixed(1)}m` : `${progress.offsetMeters.toFixed(1)}m`}
            </div>
          </div>
          <div>
            {isPerfectStop ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Perfect Spot (+50 Pts)
              </span>
            ) : isGoodStop ? (
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Safe Stop Zone
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Rough Margin
              </span>
            )}
          </div>
        </div>

        {/* PASSENGER BOARDING PROGRESS */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300">
              {progress.isComplete ? 'Boarding Complete' : 'Passengers Embarking & Disembarking...'}
            </span>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {Math.round(progress.boardingProgress)}%
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress.boardingProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Waiting on platform: {progress.station.passengersWaiting}</span>
            <span className="text-emerald-400 font-mono">
              +{progress.passengersBoarded} Passengers Exchanged
            </span>
          </div>
        </div>

        {/* DEPARTURE ACTION */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            disabled={!progress.isComplete}
            onClick={onDepartStation}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              progress.isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {progress.isComplete ? (
              <>
                Clear to Depart <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Waiting for passenger transfer...'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
