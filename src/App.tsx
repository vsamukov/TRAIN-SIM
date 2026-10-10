/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrainPhysicsState,
  WeatherType,
  CameraView,
  ViolationRecord,
  GameStats,
  StationStopProgress,
  StationData,
} from './types/game';
import {
  STATIONS,
  SEMAPHORES,
  TOTAL_ROUTE_METERS,
  getCurrentSpeedLimit,
  getNextSpeedLimit,
  getNextSemaphore,
  getNextStation,
  getCurrentGradient,
} from './utils/trackData';
import { updateTrainPhysics } from './utils/physics';
import { soundEngine } from './utils/audio';

import { TrainCanvas } from './components/TrainCanvas';
import { CabDashboard } from './components/CabDashboard';
import { HUD } from './components/HUD';
import { StationModal } from './components/StationModal';
import { ViolationToast } from './components/ViolationToast';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { TutorialModal } from './components/TutorialModal';

const INITIAL_PHYSICS_STATE: TrainPhysicsState = {
  distanceMeters: 0,
  speedKmh: 0,
  speedMs: 0,
  accelerationMs2: 0,
  throttlePercent: 0,
  actualThrottle: 0,
  brakePercent: 45, // Station hold brake initially applied
  brakePipePressureBar: 4.3,
  brakeCylinderPressureBar: 1.6,
  reverser: 1, // Forward
  tractiveForceKn: 0,
  brakingForceKn: 60,
  slopePercent: 0,
  currentCurvature: 0,
  wheelSlip: false,
  emergencyBrakeActive: false,
};

export default function App() {
  // Primary Physics State
  const [physics, setPhysics] = useState<TrainPhysicsState>(INITIAL_PHYSICS_STATE);

  // Gameplay Safety & License
  const [safetyPoints, setSafetyPoints] = useState<number>(10);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [activeToast, setActiveToast] = useState<ViolationRecord | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Environmental & Cab Controls
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [cameraView, setCameraView] = useState<CameraView>('cab');
  const [wipersActive, setWipersActive] = useState<boolean>(false);
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(true);
  const [hornActive, setHornActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Station Docking & Boarding Progress
  const [activeStationStop, setActiveStationStop] = useState<StationStopProgress | null>(null);
  const servicedStationsRef = useRef<Set<string>>(new Set());

  // Statistics
  const [stats, setStats] = useState<GameStats>({
    totalDistanceKm: 0,
    passengersDelivered: 0,
    maxSpeedAchieved: 0,
    startTime: Date.now(),
    cleanStations: 0,
  });

  // Violation tracking state refs
  const overspeedTimerRef = useRef<number>(0);
  const passedRedSignalsRef = useRef<Set<string>>(new Set());
  const missedStationsRef = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<number | null>(null);

  // Audio start on first interaction flag
  const audioStartedRef = useRef<boolean>(false);

  const initAudio = useCallback(() => {
    if (!audioStartedRef.current) {
      soundEngine.startEngine();
      audioStartedRef.current = true;
    }
  }, []);

  // Helper to trigger violation
  const recordViolation = useCallback(
    (
      type: ViolationRecord['type'],
      description: string,
      points: number,
      locationKm: number
    ) => {
      soundEngine.playViolationAlarm();
      const newRec: ViolationRecord = {
        id: `v_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        type,
        description,
        pointsDeducted: points,
        locationKm,
      };

      setViolations((prev) => [...prev, newRec]);
      setActiveToast(newRec);

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setActiveToast(null);
      }, 4500);

      setSafetyPoints((prev) => {
        const next = Math.max(0, prev - points);
        if (next === 0) {
          setIsGameOver(true);
        }
        return next;
      });
    },
    []
  );

  // MAIN SIMULATION PHYSICS LOOP (60 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      if (!isGameOver && !isVictory) {
        setPhysics((prev) => {
          const next = updateTrainPhysics(prev, dt, weather);

          // Update audio sound engine
          soundEngine.updateEngine(next.speedKmh, next.actualThrottle);
          soundEngine.triggerRailClick(next.speedKmh);
          soundEngine.updateBrakeSqueal(next.brakePercent, next.speedKmh);

          // Check Speed Limit Violations
          const currentLimit = getCurrentSpeedLimit(next.distanceMeters);
          if (next.speedKmh > currentLimit + 4) {
            overspeedTimerRef.current += dt;
            if (overspeedTimerRef.current > 3.2) {
              overspeedTimerRef.current = 0;
              recordViolation(
                'speeding',
                `Exceeded posted speed limit (${Math.round(next.speedKmh)} km/h in ${currentLimit} km/h zone)`,
                1,
                next.distanceMeters / 1000
              );
            }
          } else {
            overspeedTimerRef.current = Math.max(0, overspeedTimerRef.current - dt * 2);
          }

          // Check Semaphores (Passing Red Signal)
          SEMAPHORES.forEach((sig) => {
            if (sig.aspect === 'red' && !passedRedSignalsRef.current.has(sig.id)) {
              if (
                next.distanceMeters >= sig.distanceMeters &&
                next.distanceMeters <= sig.distanceMeters + 35
              ) {
                passedRedSignalsRef.current.add(sig.id);
                recordViolation(
                  'spad',
                  `Signal Passed At Danger! Ran red semaphore at ${sig.name}`,
                  3,
                  next.distanceMeters / 1000
                );
              }
            }
          });

          // Check Stations
          STATIONS.forEach((station) => {
            const distDiff = station.distanceMeters - next.distanceMeters;

            // Approaching station: check if train stops inside platform target zone
            if (
              Math.abs(distDiff) <= 22 &&
              Math.abs(next.speedKmh) <= 0.6 &&
              !servicedStationsRef.current.has(station.id) &&
              !activeStationStop
            ) {
              // Successfully docked at station!
              soundEngine.playStationChime();
              setActiveStationStop({
                station,
                stoppedInsideZone: true,
                offsetMeters: distDiff,
                boardingProgress: 0,
                isBoarding: true,
                isComplete: false,
                passengersBoarded: 0,
              });
            }

            // Missed station violation: blowing past without stopping
            if (
              distDiff < -40 &&
              !servicedStationsRef.current.has(station.id) &&
              !missedStationsRef.current.has(station.id)
            ) {
              missedStationsRef.current.add(station.id);
              recordViolation(
                'missed_station',
                `Missed scheduled stop at ${station.name}! Passengers stranded`,
                2,
                next.distanceMeters / 1000
              );
            }
          });

          // Check Route End / Victory
          if (next.distanceMeters >= TOTAL_ROUTE_METERS - 80 && Math.abs(next.speedKmh) <= 1.0) {
            setIsVictory(true);
          }

          // Update max speed and stats
          setStats((s) => ({
            ...s,
            totalDistanceKm: next.distanceMeters / 1000,
            maxSpeedAchieved: Math.max(s.maxSpeedAchieved, Math.abs(next.speedKmh)),
          }));

          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [weather, isGameOver, isVictory, activeStationStop, recordViolation]);

  // Handle passenger boarding progress interval
  useEffect(() => {
    if (!activeStationStop || !activeStationStop.isBoarding || activeStationStop.isComplete) {
      return;
    }

    const interval = setInterval(() => {
      setActiveStationStop((prev) => {
        if (!prev) return null;
        const nextProgress = Math.min(100, prev.boardingProgress + 3.2);
        const boarded = Math.round((nextProgress / 100) * prev.station.passengersWaiting);

        if (nextProgress >= 100) {
          soundEngine.playStationChime();
          return {
            ...prev,
            boardingProgress: 100,
            isBoarding: false,
            isComplete: true,
            passengersBoarded: boarded,
          };
        }
        return {
          ...prev,
          boardingProgress: nextProgress,
          passengersBoarded: boarded,
        };
      });
    }, 120);

    return () => clearInterval(interval);
  }, [activeStationStop]);

  // Depart station
  const handleDepartStation = useCallback(() => {
    if (!activeStationStop) return;
    servicedStationsRef.current.add(activeStationStop.station.id);
    const addedPassengers = activeStationStop.passengersBoarded;
    const isClean = Math.abs(activeStationStop.offsetMeters) <= 12;

    setStats((prev) => ({
      ...prev,
      passengersDelivered: prev.passengersDelivered + addedPassengers,
      cleanStations: isClean ? prev.cleanStations + 1 : prev.cleanStations,
    }));

    setActiveStationStop(null);
  }, [activeStationStop]);

  // Restart Game / New Shift
  const handleRestart = useCallback(() => {
    setPhysics(INITIAL_PHYSICS_STATE);
    setSafetyPoints(10);
    setViolations([]);
    setActiveToast(null);
    setIsGameOver(false);
    setIsVictory(false);
    setActiveStationStop(null);
    servicedStationsRef.current.clear();
    missedStationsRef.current.clear();
    passedRedSignalsRef.current.clear();
    overspeedTimerRef.current = 0;
    setStats({
      totalDistanceKm: 0,
      passengersDelivered: 0,
      maxSpeedAchieved: 0,
      startTime: Date.now(),
      cleanStations: 0,
    });
  }, []);

  // Controls Handlers
  const handleSetThrottle = useCallback((val: number) => {
    initAudio();
    setPhysics((prev) => ({
      ...prev,
      throttlePercent: Math.max(0, Math.min(100, val)),
      // If throttle engaged while emergency active, disengage emergency brake
      emergencyBrakeActive: val > 10 ? false : prev.emergencyBrakeActive,
    }));
  }, [initAudio]);

  const handleSetBrake = useCallback((val: number) => {
    initAudio();
    soundEngine.playBrakeHiss();
    setPhysics((prev) => ({
      ...prev,
      brakePercent: Math.max(0, Math.min(100, val)),
      emergencyBrakeActive: val >= 95 ? true : false,
    }));
  }, [initAudio]);

  const handleToggleReverser = useCallback(() => {
    initAudio();
    setPhysics((prev) => {
      // Safety interlock: cannot reverse while train moving fast
      if (Math.abs(prev.speedKmh) > 2) return prev;
      return {
        ...prev,
        reverser: prev.reverser === 1 ? -1 : 1,
      };
    });
  }, [initAudio]);

  const handleEmergencyBrake = useCallback(() => {
    initAudio();
    soundEngine.playBrakeHiss();
    soundEngine.playViolationAlarm();
    setPhysics((prev) => ({
      ...prev,
      throttlePercent: 0,
      brakePercent: 100,
      emergencyBrakeActive: true,
    }));
  }, [initAudio]);

  const handleToggleWipers = useCallback(() => {
    initAudio();
    soundEngine.playWiperSwipe();
    setWipersActive((prev) => !prev);
  }, [initAudio]);

  const handleToggleHeadlights = useCallback(() => {
    initAudio();
    setHeadlightsOn((prev) => !prev);
  }, [initAudio]);

  const handleStartHorn = useCallback(() => {
    initAudio();
    setHornActive(true);
    soundEngine.startHorn();
  }, [initAudio]);

  const handleStopHorn = useCallback(() => {
    setHornActive(false);
    soundEngine.stopHorn();
  }, []);

  const handleToggleMute = useCallback(() => {
    initAudio();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundEngine.setMuted(nextMute);
  }, [initAudio, isMuted]);

  const handleChangeWeather = useCallback((newWeather: WeatherType) => {
    initAudio();
    setWeather(newWeather);
    soundEngine.updateRainSound(newWeather === 'rain');
    if (newWeather === 'rain' || newWeather === 'snow') {
      setWipersActive(true);
    }
  }, [initAudio]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts if in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      initAudio();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          e.preventDefault();
          setPhysics((p) => ({ ...p, throttlePercent: Math.min(100, p.throttlePercent + 5) }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          e.preventDefault();
          setPhysics((p) => ({ ...p, throttlePercent: Math.max(0, p.throttlePercent - 5) }));
          break;
        case 'KeyD':
          e.preventDefault();
          setPhysics((p) => ({ ...p, brakePercent: Math.min(100, p.brakePercent + 5) }));
          soundEngine.playBrakeHiss();
          break;
        case 'KeyA':
          e.preventDefault();
          setPhysics((p) => ({ ...p, brakePercent: Math.max(0, p.brakePercent - 5) }));
          soundEngine.playBrakeHiss();
          break;
        case 'Space':
          e.preventDefault();
          setPhysics((p) => ({ ...p, brakePercent: Math.min(100, p.brakePercent + 20) }));
          soundEngine.playBrakeHiss();
          break;
        case 'KeyH':
          e.preventDefault();
          if (!hornActive) {
            handleStartHorn();
          }
          break;
        case 'KeyE':
          e.preventDefault();
          handleEmergencyBrake();
          break;
        case 'KeyP':
          e.preventDefault();
          handleToggleWipers();
          break;
        case 'KeyL':
          e.preventDefault();
          handleToggleHeadlights();
          break;
        case 'KeyC':
          e.preventDefault();
          setCameraView((prev) => (prev === 'cab' ? 'chase' : prev === 'chase' ? 'trackside' : 'cab'));
          break;
        case 'KeyM':
          e.preventDefault();
          handleToggleMute();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        handleStopHorn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    initAudio,
    hornActive,
    handleStartHorn,
    handleStopHorn,
    handleEmergencyBrake,
    handleToggleWipers,
    handleToggleHeadlights,
    handleToggleMute,
  ]);

  const currentSpeedLimit = getCurrentSpeedLimit(physics.distanceMeters);
  const nextSemaphore = getNextSemaphore(physics.distanceMeters);
  const nextStation = getNextStation(physics.distanceMeters);
  const currentGrade = getCurrentGradient(physics.distanceMeters);

  return (
    <div
      onClick={initAudio}
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-950 font-sans select-none"
    >
      {/* TOP BAR / HUD */}
      <HUD
        safetyPoints={safetyPoints}
        currentSpeedKmh={physics.speedKmh}
        speedLimitKmh={currentSpeedLimit}
        distanceKm={physics.distanceMeters / 1000}
        nextStation={nextStation}
        nextSemaphore={nextSemaphore}
        cameraView={cameraView}
        gradientPercent={currentGrade}
        onSetCameraView={setCameraView}
        onOpenHelp={() => setShowTutorial(true)}
        onRestart={handleRestart}
      />

      {/* VIOLATION TOAST ALERT */}
      <ViolationToast
        violation={activeToast}
        currentPoints={safetyPoints}
      />

      {/* 3D PERSPECTIVE CANVAS SIMULATOR */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <TrainCanvas
          physics={physics}
          weather={weather}
          cameraView={cameraView}
          wipersActive={wipersActive}
          headlightsOn={headlightsOn}
          hornActive={hornActive}
          activeStationStop={activeStationStop}
        />

        {/* STATION BOARDING MODAL (when docked inside stopping box) */}
        {activeStationStop && (
          <StationModal
            progress={activeStationStop}
            onDepartStation={handleDepartStation}
          />
        )}
      </main>

      {/* BOTTOM CABIN DASHBOARD CONSOLE (THROTTLE & BRAKE CONTROLS) */}
      <CabDashboard
        physics={physics}
        speedLimitKmh={currentSpeedLimit}
        weather={weather}
        wipersActive={wipersActive}
        headlightsOn={headlightsOn}
        hornActive={hornActive}
        isMuted={isMuted}
        onSetThrottle={handleSetThrottle}
        onSetBrake={handleSetBrake}
        onToggleReverser={handleToggleReverser}
        onEmergencyBrake={handleEmergencyBrake}
        onToggleWipers={handleToggleWipers}
        onToggleHeadlights={handleToggleHeadlights}
        onStartHorn={handleStartHorn}
        onStopHorn={handleStopHorn}
        onToggleMute={handleToggleMute}
        onChangeWeather={handleChangeWeather}
      />

      {/* GAME OVER MODAL (0 POINTS) */}
      {isGameOver && (
        <GameOverModal
          violations={violations}
          stats={stats}
          onRestart={handleRestart}
        />
      )}

      {/* VICTORY MODAL (ROUTE COMPLETE) */}
      {isVictory && (
        <VictoryModal
          stats={stats}
          safetyPoints={safetyPoints}
          violations={violations}
          onRestart={handleRestart}
        />
      )}

      {/* TUTORIAL / DRIVER GUIDE */}
      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
