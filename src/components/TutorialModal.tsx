import React from 'react';
import { X, CheckCircle, ShieldAlert, Sliders, Users, Radio, CloudRain } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-400">
              Railway Operating Manual
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Locomotive Driver Rules & Physics Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT SECTIONS */}
        <div className="space-y-4 my-4 text-xs text-slate-300">
          {/* SECTION 1: TRAIN INERTIA */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg shrink-0 text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                Huge Train Inertia & Two Controls
              </h4>
              <p className="leading-relaxed text-slate-300">
                Your 620-tonne express train carries tremendous momentum.
                <strong className="text-amber-300"> Throttle:</strong> Prime mover RPM takes 2–3 seconds to spool up torque.
                <strong className="text-rose-300"> Air Brake:</strong> Drops brake pipe pressure to clamp friction shoes; stopping from 80 km/h requires 350+ meters. Always plan your braking well ahead!
              </p>
            </div>
          </div>

          {/* SECTION 2: STATIONS & PASSENGERS */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-cyan-950/60 border border-cyan-800/80 rounded-lg shrink-0 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                Station Stopping Target Box
              </h4>
              <p className="leading-relaxed text-slate-300">
                Each station has a designated platform target box marked with a yellow diamond stop board. You must bring the train to a complete halt (0 km/h) within <strong className="text-cyan-300">&plusmn;15 meters</strong> of the marker. Doors open automatically and passenger embarkation begins. Overshooting or bypassing deducts 2 penalty points!
              </p>
            </div>
          </div>

          {/* SECTION 3: SEMAPHORES & SPEED LIMITS */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-lg shrink-0 text-emerald-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                Semaphores & Railway Signals
              </h4>
              <p className="leading-relaxed text-slate-300">
                <span className="text-emerald-400 font-bold">Green:</span> Clear to proceed at posted speed limit. <br />
                <span className="text-amber-400 font-bold">Yellow:</span> Caution; reduce speed to &le; 40 km/h before the next signal. <br />
                <span className="text-rose-400 font-bold">Red:</span> Danger! Train must stop completely before signal base. Passing a red semaphore incurs severe emergency penalties (-3 points)!
              </p>
            </div>
          </div>

          {/* SECTION 4: 10 PENALTY POINTS SYSTEM */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-rose-950/60 border border-rose-800/80 rounded-lg shrink-0 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                10 Safety License Points
              </h4>
              <p className="leading-relaxed text-slate-300">
                You begin each run with <strong className="text-white">10 Points</strong>.
                Exceeding speed limits (-1), bypassing stations (-2), or violating signals (-3) deducts points. If your score reaches <strong className="text-rose-400">0</strong>, your driving license is suspended and it is Game Over!
              </p>
            </div>
          </div>

          {/* SECTION 5: KEYBOARD SHORTCUTS */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <h4 className="font-semibold text-white text-xs mb-2 uppercase tracking-wider text-slate-400">
              Keyboard Controls
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">W</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">&uarr;</kbd> : Throttle Up</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">S</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">&darr;</kbd> : Throttle Down</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-rose-300">Space</kbd> : Quick Brake</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-rose-300">A / D</kbd> : Brake Notch Down / Up</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">H</kbd> : Two-Tone Horn</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">E</kbd> : Emergency Brake</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">C</kbd> : Cycle Camera View</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">P</kbd> : Windshield Wipers</div>
            </div>
          </div>
        </div>

        {/* CLOSE BUTTON */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Understood, Return to Cab
          </button>
        </div>
      </div>
    </div>
  );
};
