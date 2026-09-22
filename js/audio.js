/**
 * Web Audio API Procedural Audio Synthesizer
 * Generates all sound effects directly in the browser with 0 external asset loading!
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Active sound nodes
    this.fireNode = null;
    this.fireGain = null;
    this.sprayNode = null;
    this.sprayGain = null;
    this.alarmInterval = null;
    this.isAlarmPlaying = false;
    this.earthquakeOsc = null;
    this.earthquakeGain = null;
    this.metronomeInterval = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      console.log('Procedural Web Audio Engine initialized.');
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- Noise Buffer Helpers ---
  createNoiseBuffer(type = 'white', seconds = 2) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'pink') {
        // Paul Kellet's pink noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  // --- Fire Crackle & Roar ---
  startFireSound(intensity = 1.0) {
    this.resume();
    if (this.fireNode || !this.ctx) return;

    const noiseBuffer = this.createNoiseBuffer('pink', 3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter for fire roar
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(Math.min(0.5, intensity * 0.45), this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.fireGain);
    this.fireGain.connect(this.masterGain);

    noiseSource.start();
    this.fireNode = noiseSource;

    // Crackle pops interval
    this.fireCrackleInterval = setInterval(() => {
      if (!this.ctx || this.isMuted || !this.fireNode) return;
      if (Math.random() < 0.6) {
        this.playPopSound();
      }
    }, 180);
  }

  updateFireIntensity(intensity) {
    if (this.fireGain && this.ctx) {
      const targetGain = Math.max(0, Math.min(0.6, intensity * 0.5));
      this.fireGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }

  stopFireSound() {
    if (this.fireNode) {
      try { this.fireNode.stop(); } catch (e) {}
      this.fireNode = null;
    }
    if (this.fireCrackleInterval) {
      clearInterval(this.fireCrackleInterval);
      this.fireCrackleInterval = null;
    }
  }

  playPopSound() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // --- Fire Extinguisher Pressurized Discharge ---
  setExtinguisherSpray(active = false) {
    this.resume();
    if (!this.ctx) return;

    if (active && !this.sprayNode) {
      const buffer = this.createNoiseBuffer('white', 2);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      this.sprayGain = this.ctx.createGain();
      this.sprayGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.sprayGain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.08);

      source.connect(filter);
      filter.connect(this.sprayGain);
      this.sprayGain.connect(this.masterGain);

      source.start();
      this.sprayNode = source;
    } else if (!active && this.sprayNode) {
      if (this.sprayGain) {
        this.sprayGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      }
      setTimeout(() => {
        if (this.sprayNode) {
          try { this.sprayNode.stop(); } catch (e) {}
          this.sprayNode = null;
        }
      }, 90);
    }
  }

  // --- Fire Alarm Evacuation Siren ---
  startAlarm() {
    this.resume();
    if (this.isAlarmPlaying || !this.ctx) return;
    this.isAlarmPlaying = true;

    // NFPA Temporal-3 pattern simulator
    let step = 0;
    this.alarmInterval = setInterval(() => {
      if (!this.isAlarmPlaying || !this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      // Pulse tone at step 0, 1, 2, pause at 3, 4
      if (step < 3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1020, t + 0.25);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.setValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.48);
      }
      step = (step + 1) % 5;
    }, 500);
  }

  stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // --- Earthquake Seismic Tremor ---
  startEarthquakeRumble(intensity = 1.0) {
    this.resume();
    if (this.earthquakeOsc || !this.ctx) return;

    // Sub-bass rumble
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(32, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(85, this.ctx.currentTime);

    this.earthquakeGain = this.ctx.createGain();
    this.earthquakeGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.earthquakeGain.gain.linearRampToValueAtTime(0.4 * intensity, this.ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(this.earthquakeGain);
    this.earthquakeGain.connect(this.masterGain);

    osc.start();
    this.earthquakeOsc = osc;

    // Add intermittent creaks/groans
    this.earthquakeCreakInterval = setInterval(() => {
      if (!this.earthquakeOsc || !this.ctx) return;
      if (Math.random() < 0.4) {
        this.playCreakSound();
      }
    }, 450);
  }

  stopEarthquakeRumble() {
    if (this.earthquakeGain && this.ctx) {
      this.earthquakeGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    }
    setTimeout(() => {
      if (this.earthquakeOsc) {
        try { this.earthquakeOsc.stop(); } catch (e) {}
        this.earthquakeOsc = null;
      }
      if (this.earthquakeCreakInterval) {
        clearInterval(this.earthquakeCreakInterval);
        this.earthquakeCreakInterval = null;
      }
    }, 850);
  }

  playCreakSound() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 + Math.random() * 80, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  // --- CPR & AED Defibrillator Sounds ---
  startCPRMetronome(bpm = 110) {
    this.resume();
    this.stopCPRMetronome();
    const intervalMs = (60 / bpm) * 1000;

    this.metronomeInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      this.playMetronomeTick();
    }, intervalMs);
    this.playMetronomeTick();
  }

  stopCPRMetronome() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
  }

  playMetronomeTick() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playAEDCharge() {
    this.resume();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 2.5);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 2.4);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 2.65);
  }

  playAEDShock() {
    this.resume();
    if (!this.ctx) return;
    // Heavy thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // Electric zap snap
    const zap = this.ctx.createOscillator();
    const zapGain = this.ctx.createGain();
    zap.type = 'square';
    zap.frequency.setValueAtTime(1400, this.ctx.currentTime);
    zap.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);

    zapGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    zapGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    zap.connect(zapGain);
    zapGain.connect(this.masterGain);
    zap.start();
    zap.stop(this.ctx.currentTime + 0.09);
  }

  // --- UI & Interaction Feedback ---
  playClick() {
    this.resume();
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  playSuccess() {
    this.resume();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playWarning() {
    this.resume();
    if (!this.ctx || this.isMuted) return;
    [0, 0.14].forEach((delay) => {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  stopAll() {
    this.stopFireSound();
    this.setExtinguisherSpray(false);
    this.stopAlarm();
    this.stopEarthquakeRumble();
    this.stopCPRMetronome();
  }
}
