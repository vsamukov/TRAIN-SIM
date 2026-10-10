/**
 * Web Audio API synthesizer for realistic train sound effects:
 * Diesel prime mover rumble, rail joint click-clack, air brake hiss,
 * wheel flange squeal, two-tone horn, station chimes, and penalty buzzer.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Continuous sound nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private rainGain: GainNode | null = null;
  private rainNode: AudioNode | null = null;

  private squealGain: GainNode | null = null;
  private squealOsc: OscillatorNode | null = null;

  // State
  private lastClickTime: number = 0;
  private isHornPlaying: boolean = false;
  private hornNodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx?.currentTime || 0);
    }
    if (this.rainGain) {
      this.rainGain.gain.setValueAtTime(muted ? 0 : 0.15, this.ctx?.currentTime || 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start background engine sound loops
   */
  public startEngine() {
    this.initCtx();
    if (!this.ctx || this.engineGain) return;

    try {
      // Dual oscillator engine rumble
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Modulate engine pitch and intensity based on throttle & speed
   */
  public updateEngine(speedKmh: number, throttlePercent: number) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    if (this.isMuted) return;

    const baseFreq = 42 + (throttlePercent / 100) * 35 + (speedKmh / 140) * 25;
    const filterFreq = 120 + (throttlePercent / 100) * 180 + (speedKmh / 140) * 120;
    const volume = 0.18 + (throttlePercent / 100) * 0.15 + (speedKmh / 140) * 0.1;

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.2);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.2);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.2);
    this.engineGain.gain.setTargetAtTime(volume, now, 0.2);
  }

  /**
   * Periodic rail click-clack based on wheel rotation
   */
  public triggerRailClick(speedKmh: number) {
    if (this.isMuted || speedKmh < 5) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = performance.now();
    // Intervals decrease with speed (at 80 km/h ~ 700ms between joint pairs)
    const intervalMs = Math.max(220, (140 / Math.max(10, speedKmh)) * 400);

    if (now - this.lastClickTime > intervalMs) {
      this.lastClickTime = now;
      this.playRailPair(speedKmh);
    }
  }

  private playRailPair(speedKmh: number) {
    if (!this.ctx || this.isMuted) return;
    const audioNow = this.ctx.currentTime;
    const intensity = Math.min(1, speedKmh / 90);

    // Click 1 (front bogie)
    this.playRailImpulse(audioNow, intensity * 0.25);
    // Click 2 (rear bogie, 70ms later)
    this.playRailImpulse(audioNow + 0.07, intensity * 0.2);
  }

  private playRailImpulse(time: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, time);
    filter.Q.setValueAtTime(2.0, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Air brake release hiss ("pshhhh")
   */
  public playBrakeHiss() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  /**
   * Brake shoe friction squeal during deceleration
   */
  public updateBrakeSqueal(brakePercent: number, speedKmh: number) {
    if (this.isMuted || !this.ctx) return;

    if (brakePercent > 35 && speedKmh > 10 && speedKmh < 65) {
      if (!this.squealGain) {
        this.squealOsc = this.ctx.createOscillator();
        this.squealGain = this.ctx.createGain();

        this.squealOsc.type = 'sine';
        this.squealOsc.frequency.setValueAtTime(2400, this.ctx.currentTime);
        this.squealGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.squealOsc.connect(this.squealGain);
        this.squealGain.connect(this.ctx.destination);
        this.squealOsc.start();
      }
      const intensity = (brakePercent / 100) * (1 - speedKmh / 70) * 0.12;
      this.squealGain.gain.setTargetAtTime(intensity, this.ctx.currentTime, 0.1);
      this.squealOsc?.frequency.setTargetAtTime(2200 + (speedKmh / 65) * 400, this.ctx.currentTime, 0.1);
    } else if (this.squealGain) {
      this.squealGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Iconic two-tone locomotive horn (F4 + A4 / D4 chord)
   */
  public startHorn() {
    this.initCtx();
    if (!this.ctx || this.isMuted || this.isHornPlaying) return;

    this.isHornPlaying = true;
    const now = this.ctx.currentTime;
    const freqs = [349.23, 440.0, 523.25]; // F4, A4, C5 American/European dual-tone
    const gain = this.ctx.createGain();
    const oscs: OscillatorNode[] = [];

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.05);

    freqs.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      osc.connect(filter);
      filter.connect(gain);
      osc.start(now);
      oscs.push(osc);
    });

    gain.connect(this.ctx.destination);
    this.hornNodes = { oscs, gain };
  }

  public stopHorn() {
    if (!this.ctx || !this.isHornPlaying || !this.hornNodes) return;
    const now = this.ctx.currentTime;
    this.hornNodes.gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    setTimeout(() => {
      this.hornNodes?.oscs.forEach((osc) => osc.stop());
      this.hornNodes = null;
      this.isHornPlaying = false;
    }, 180);
  }

  /**
   * Station arrival chime / departure whistle
   */
  public playStationChime() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const hitTime = now + idx * 0.18;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, hitTime);

      gain.gain.setValueAtTime(0.2, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(hitTime);
      osc.stop(hitTime + 0.7);
    });
  }

  /**
   * Penalty violation alert buzzer
   */
  public playViolationAlarm() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const startTime = now + i * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, startTime);
      osc.frequency.setValueAtTime(180, startTime + 0.08);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.14);
    }
  }

  /**
   * Ambient weather rain loop
   */
  public updateRainSound(isRaining: boolean) {
    this.initCtx();
    if (!this.ctx) return;

    if (isRaining && !this.rainNode) {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(this.isMuted ? 0 : 0.14, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);

      noise.start();
      this.rainNode = noise;
    } else if (!isRaining && this.rainGain) {
      this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Windshield wiper swipe squeak
   */
  public playWiperSwipe() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Crisp mechanical lever notch detent click
   */
  public playLeverClick() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.03);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundEngine = new SoundEngine();
