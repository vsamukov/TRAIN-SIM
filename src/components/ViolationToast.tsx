import React from 'react';
import { ViolationRecord } from '../types/game';
import { AlertOctagon } from 'lucide-react';

interface ViolationToastProps {
  violation: ViolationRecord | null;
  currentPoints: number;
}

export const ViolationToast: React.FC<ViolationToastProps> = ({
  violation,
  currentPoints,
}) => {
  if (!violation) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-rose-950/95 border-2 border-rose-500 text-rose-100 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3.5 max-w-lg">
        <div className="p-2 bg-rose-900 rounded-xl shrink-0">
          <AlertOctagon className="w-6 h-6 text-rose-300 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Safety Violation!
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-900/80 px-2 py-0.5 rounded">
              -{violation.pointsDeducted} PT{violation.pointsDeducted > 1 ? 'S' : ''}
            </span>
          </div>
          <p className="text-xs font-medium text-rose-100 mt-0.5">
            {violation.description}
          </p>
          <div className="text-[11px] text-rose-300/80 mt-1 font-mono">
            Safety Balance Remaining: {currentPoints} / 10
          </div>
        </div>
      </div>
    </div>
  );
};
