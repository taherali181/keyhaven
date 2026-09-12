import { SwitchSound, AmbientSound } from '@/types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private currentAmbientNode: { stop: () => void } | null = null;
  private isInitialized = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playKeySound(type: SwitchSound, volume: number = 0.5, isSpecialKey = false) {
    if (type === 'off' || volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.7, now);
      masterGain.connect(this.ctx.destination);

      switch (type) {
        case 'cherry-blue':
          this.playCherryBlue(now, masterGain, isSpecialKey);
          break;
        case 'gateron-brown':
          this.playGateronBrown(now, masterGain, isSpecialKey);
          break;
        case 'cherry-red':
          this.playCherryRed(now, masterGain, isSpecialKey);
          break;
        case 'holy-panda':
          this.playHolyPanda(now, masterGain, isSpecialKey);
          break;
        case 'typewriter':
          this.playTypewriter(now, masterGain, isSpecialKey);
          break;
        case 'raindrop':
          this.playRaindrop(now, masterGain, isSpecialKey);
          break;
      }
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }

  // --- Mechanical Switch Synthesizers ---

  private playCherryBlue(t: number, out: GainNode, isSpace: boolean) {
    if (!this.ctx) return;
    // High crisp click impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isSpace ? 1800 : 2800 + (Math.random() * 400 - 200);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.025);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.04);

    // Spring resonance thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isSpace ? 120 : 180, t);
    subOsc.frequency.exponentialRampToValueAtTime(60, t + 0.05);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    subOsc.connect(subGain);
    subGain.connect(out);

    subOsc.start(t);
    subOsc.stop(t + 0.06);
  }

  private playGateronBrown(t: number, out: GainNode, isSpace: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isSpace ? 280 : 420 + (Math.random() * 60 - 30);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playCherryRed(t: number, out: GainNode, isSpace: boolean) {
    if (!this.ctx) return;
    // Soft muted linear thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isSpace ? 140 : 200 + (Math.random() * 40 - 20);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.035);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  private playHolyPanda(t: number, out: GainNode, isSpace: boolean) {
    if (!this.ctx) return;
    // Deep tactile "thock"
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = isSpace ? 180 : 320 + (Math.random() * 50 - 25);
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(90, t + 0.05);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 0.5, t);
    osc2.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.07);
    osc2.stop(t + 0.07);
  }

  private playTypewriter(t: number, out: GainNode, isEnter: boolean) {
    if (!this.ctx) return;
    if (isEnter) {
      // Vintage typewriter carriage bell!
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(2093, t); // High C7 bell
      bellGain.gain.setValueAtTime(0.7, t);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      bell.connect(bellGain);
      bellGain.connect(out);
      bell.start(t);
      bell.stop(t + 0.85);
    } else {
      // Metallic mechanical impact
      const noiseBuffer = this.createNoiseBuffer(0.04);
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(3, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      noise.start(t);
      noise.stop(t + 0.045);
    }
  }

  private playRaindrop(t: number, out: GainNode, isSpace: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const startFreq = isSpace ? 500 : 700 + (Math.random() * 400 - 200);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.8, t + 0.03);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.4, t + 0.09);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  private createNoiseBuffer(durationSec: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext missing');
    const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- Ambient Procedural Sound Generator ---

  public setAmbient(type: AmbientSound, volume: number = 0.5) {
    if (this.currentAmbientNode) {
      this.currentAmbientNode.stop();
      this.currentAmbientNode = null;
    }

    if (type === 'none' || volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);
      masterGain.connect(this.ctx.destination);
      this.ambientGain = masterGain;

      switch (type) {
        case 'rain':
          this.currentAmbientNode = this.startRainAmbient(masterGain);
          break;
        case 'fireplace':
          this.currentAmbientNode = this.startFireplaceAmbient(masterGain);
          break;
        case 'forest':
          this.currentAmbientNode = this.startForestAmbient(masterGain);
          break;
        case 'alpha-waves':
          this.currentAmbientNode = this.startAlphaWaves(masterGain);
          break;
        case 'cafe':
        case 'zen-river':
          this.currentAmbientNode = this.startRiverAmbient(masterGain);
          break;
      }
    } catch {
      // Ignore ambient startup error
    }
  }

  public setAmbientVolume(volume: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume * 0.4)),
        this.ctx.currentTime + 0.1
      );
    }
  }

  private startRainAmbient(out: GainNode) {
    if (!this.ctx) return null;
    // Continuous filtered pink-noise rain with gentle modulation
    const buffer = this.createNoiseBuffer(5);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1000;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 200;

    source.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(out);

    source.start();

    return {
      stop: () => {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      }
    };
  }

  private startFireplaceAmbient(out: GainNode) {
    if (!this.ctx) return null;
    const buffer = this.createNoiseBuffer(4);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(out);

    source.start();

    return {
      stop: () => {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      }
    };
  }

  private startForestAmbient(out: GainNode) {
    if (!this.ctx) return null;
    const buffer = this.createNoiseBuffer(6);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    // LFO for swaying wind
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.2; // slow breeze
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(out);

    source.start();
    lfo.start();

    return {
      stop: () => {
        try {
          source.stop();
          lfo.stop();
          source.disconnect();
        } catch {}
      }
    };
  }

  private startRiverAmbient(out: GainNode) {
    if (!this.ctx) return null;
    const buffer = this.createNoiseBuffer(5);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 750;
    filter.Q.value = 0.8;

    source.connect(filter);
    filter.connect(out);

    source.start();

    return {
      stop: () => {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      }
    };
  }

  private startAlphaWaves(out: GainNode) {
    if (!this.ctx) return null;
    // 10Hz Binaural difference (200Hz Left / 210Hz Right) for deep focus
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.frequency.value = 196; // G3
    osc2.frequency.value = 206; // 10Hz Alpha offset
    gain1.gain.value = 0.2;
    gain2.gain.value = 0.2;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(out);
    gain2.connect(out);

    osc1.start();
    osc2.start();

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        } catch {}
      }
    };
  }
}

export const soundEngine = new SoundEngine();
