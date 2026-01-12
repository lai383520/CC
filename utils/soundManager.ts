import { PieceType } from '../types';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // BGM State
  private bgmOscillators: AudioScheduledSourceNode[] = [];
  private bgmInterval: number | null = null;
  private isPlayingBGM: boolean = false;
  
  public isMuted: boolean = false;
  public bgmVolumeLevel: number = 0.3; // Default BGM Volume

  constructor() {
    // Lazy init
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5;

      // Separate channels for BGM and SFX to allow mixing
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolumeLevel; // Use stored volume
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setBGMVolume(vol: number) {
      this.bgmVolumeLevel = Math.max(0, Math.min(1, vol));
      if (this.bgmGain && this.ctx) {
          // Smooth transition to avoid clicks
          this.bgmGain.gain.setTargetAtTime(this.bgmVolumeLevel, this.ctx.currentTime, 0.1);
      }
  }

  // ==========================================
  // BGM ENGINE (Procedural Tension Track)
  // ==========================================
  
  startBGM() {
    if (this.isPlayingBGM || this.isMuted) return;
    this.init();
    this.isPlayingBGM = true;
    this.scheduleBGM();
  }

  stopBGM() {
    this.isPlayingBGM = false;
    if (this.bgmInterval) {
        window.clearTimeout(this.bgmInterval);
        this.bgmInterval = null;
    }
    this.bgmOscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    this.bgmOscillators = [];
  }

  private scheduleBGM() {
    if (!this.ctx || !this.bgmGain || !this.isPlayingBGM) return;
    
    // 130 BPM Loop
    const beatLen = 60 / 130;
    const barLen = beatLen * 4;
    const t = this.ctx.currentTime;

    // Bassline (Driving 8th notes, Cyberpunk style)
    const playBass = (time: number, freq: number) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        
        // Low pass filter for "dark" synth bass
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + beatLen/2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain!);
        osc.start(time);
        osc.stop(time + beatLen);
        this.bgmOscillators.push(osc);
    };

    // Kick Drum (Heavy thud)
    const playKick = (time: number) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.bgmGain!);
        osc.start(time);
        osc.stop(time + 0.5);
        this.bgmOscillators.push(osc);
    };

    // Arpeggio (High tension)
    const playArp = (time: number, notes: number[]) => {
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const noteTime = time + (i * (beatLen / 4)); // 16th notes
            
            gain.gain.setValueAtTime(0.05, noteTime);
            gain.gain.linearRampToValueAtTime(0, noteTime + 0.1);

            osc.connect(gain);
            gain.connect(this.bgmGain!);
            osc.start(noteTime);
            osc.stop(noteTime + 0.1);
            this.bgmOscillators.push(osc);
        });
    };

    // Schedule 1 bar
    // Kick on 1 and 3
    playKick(t);
    playKick(t + beatLen * 2);

    // Bass running 8th notes
    for(let i=0; i<8; i++) {
        playBass(t + i * (beatLen/2), i % 2 === 0 ? 55 : 110); // A1 / A2
    }

    // Arp
    playArp(t, [440, 554, 659, 880]); // A Major
    playArp(t + beatLen * 2, [392, 493, 587, 783]); // G Major

    if (this.bgmOscillators.length > 50) this.bgmOscillators = this.bgmOscillators.slice(-20);

    // Loop
    this.bgmInterval = window.setTimeout(() => this.scheduleBGM(), barLen * 1000 - 50); // slight overlap adj
  }

  // ==========================================
  // ANIME SFX ENGINE
  // ==========================================

  // Helper: FM Synthesis for Metallic/Complex sounds
  private playFM(carrierFreq: number, modFreq: number, modIdx: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    const car = this.ctx.createOscillator();
    car.type = type;
    car.frequency.value = carrierFreq;

    const mod = this.ctx.createOscillator();
    mod.frequency.value = modFreq;
    
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(modIdx, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + dur); // Modulation fades

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    mod.connect(modGain);
    modGain.connect(car.frequency);
    car.connect(gain);
    gain.connect(this.sfxGain);

    car.start();
    mod.start();
    car.stop(t + dur);
    mod.stop(t + dur);
  }

  // Helper: Filtered Noise for Wind/Explosion
  private playNoise(type: BiquadFilterType, freq: number, q: number, dur: number, vol: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    
    const fil = this.ctx.createBiquadFilter();
    fil.type = type;
    fil.frequency.setValueAtTime(freq, t);
    fil.Q.value = q;
    if (type === 'lowpass') {
        fil.frequency.exponentialRampToValueAtTime(10, t + dur); // Explosion close
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(fil);
    fil.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  // --- UI Sounds ---
  playSelect() {
    this.playFM(880, 220, 500, 0.1, 0.2);
  }
  playFlip() {
    this.playFM(600, 1200, 300, 0.3, 0.3, 'triangle'); // Mystery sound
  }
  playMove() {
     if (!this.ctx || !this.sfxGain) return;
     // Quick wood tap
     this.playNoise('lowpass', 600, 1, 0.1, 0.3);
  }

  // --- 7 DISTINCT KILL SOUNDS (2 Seconds Duration) ---

  playKill(attackerType: PieceType, isUnderdog: boolean = false) {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx!.currentTime;
    const dur = 2.0;

    // Special: Underdog (Pawn kills General) - Critical Hit!
    if (isUnderdog) {
        // High pitched FM screech + Low Boom
        this.playFM(1500, 50, 3000, 2.0, 0.5, 'sawtooth');
        this.playNoise('lowpass', 200, 1, 2.0, 1.0);
        return;
    }

    switch (attackerType) {
        case 'general': 
            // 帥/將: Emperor's Presence (Inception "Braaam")
            [50, 51, 99].forEach(freq => {
                const osc = this.ctx!.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);
                
                const filter = this.ctx!.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, t);
                filter.frequency.linearRampToValueAtTime(800, t + 1.0); // Swell

                const gain = this.ctx!.createGain();
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.6, t + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.sfxGain!);
                osc.start();
                osc.stop(t + dur);
            });
            break;

        case 'advisor':
            // 仕/士: Ninja Wind Slash
            const wind = this.ctx!.createBufferSource();
            const wBuf = this.ctx!.createBuffer(1, this.ctx!.sampleRate * dur, this.ctx!.sampleRate);
            for(let i=0; i<wBuf.length; i++) wBuf.getChannelData(0)[i] = Math.random() * 2 - 1;
            wind.buffer = wBuf;
            const wFil = this.ctx!.createBiquadFilter();
            wFil.type = 'highpass';
            wFil.frequency.setValueAtTime(1000, t);
            wFil.frequency.exponentialRampToValueAtTime(8000, t + 0.3); // Whoosh up
            const wGain = this.ctx!.createGain();
            wGain.gain.setValueAtTime(0.8, t);
            wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            wind.connect(wFil); wFil.connect(wGain); wGain.connect(this.sfxGain!);
            wind.start();
            this.playFM(2000, 0, 0, 0.8, 0.3, 'sine');
            break;

        case 'elephant':
            // 相/象: Realistic Trumpet + Earth Stomp
            // Layer 1: Trumpet Base (Detuned Sawtooths)
            [400, 404].forEach(f => {
                const osc = this.ctx!.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, t);
                // Trumpet Pitch Envelope (Rise, Sustain, Fall)
                osc.frequency.linearRampToValueAtTime(f * 1.5, t + 0.1); 
                osc.frequency.exponentialRampToValueAtTime(f * 0.8, t + 1.2);

                // Add Vibrato (LFO)
                const lfo = this.ctx!.createOscillator();
                lfo.frequency.value = 5; // 5Hz vibrato
                const lfoGain = this.ctx!.createGain();
                lfoGain.gain.value = 15; // Depth
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();
                lfo.stop(t + 1.5);

                const filter = this.ctx!.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1500;
                filter.Q.value = 3; // Brass resonance

                const gain = this.ctx!.createGain();
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.4, t + 0.1); // Attack
                gain.gain.linearRampToValueAtTime(0, t + 1.5);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.sfxGain!);
                osc.start();
                osc.stop(t + 1.5);
            });

            // Layer 2: Heavy Stomp (Sub-bass Kick)
            setTimeout(() => {
                const kick = this.ctx!.createOscillator();
                kick.frequency.setValueAtTime(100, t + 0.2);
                kick.frequency.exponentialRampToValueAtTime(10, t + 0.8);
                const kGain = this.ctx!.createGain();
                kGain.gain.setValueAtTime(1.0, t + 0.2);
                kGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
                kick.connect(kGain); kGain.connect(this.sfxGain!);
                kick.start(t + 0.2);
                kick.stop(t + 1.0);
                
                // Stomp Noise
                this.playNoise('lowpass', 200, 1, 0.8, 0.8);
            }, 200);
            break;

        case 'chariot':
            // 俥/車: Realistic Thruster / High-tech Engine
            // Layer 1: Engine Rev (Noise Sweep)
            // Simulates rushing air/jet exhaust
            const noise = this.ctx!.createBufferSource();
            const nBuf = this.ctx!.createBuffer(1, this.ctx!.sampleRate * dur, this.ctx!.sampleRate);
            for(let i=0; i<nBuf.length; i++) nBuf.getChannelData(0)[i] = Math.random() * 2 - 1;
            noise.buffer = nBuf;
            
            const nFil = this.ctx!.createBiquadFilter();
            nFil.type = 'bandpass';
            nFil.Q.value = 5;
            nFil.frequency.setValueAtTime(200, t);
            nFil.frequency.exponentialRampToValueAtTime(2500, t + 1.0); // Rev up
            
            const nGain = this.ctx!.createGain();
            nGain.gain.setValueAtTime(0, t);
            nGain.gain.linearRampToValueAtTime(0.6, t + 0.5);
            nGain.gain.linearRampToValueAtTime(0, t + 1.5);
            
            noise.connect(nFil); nFil.connect(nGain); nGain.connect(this.sfxGain!);
            noise.start();
            
            // Layer 2: Turbine Whine (Sine Wave Pitch Riser)
            const turbine = this.ctx!.createOscillator();
            turbine.type = 'sine';
            turbine.frequency.setValueAtTime(500, t);
            turbine.frequency.exponentialRampToValueAtTime(3000, t + 1.0); // Spin up
            const turGain = this.ctx!.createGain();
            turGain.gain.setValueAtTime(0, t);
            turGain.gain.linearRampToValueAtTime(0.3, t + 0.8);
            turGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            turbine.connect(turGain); turGain.connect(this.sfxGain!);
            turbine.start();

            // Layer 3: Metallic Clank/Start (Impact)
            this.playFM(100, 50, 200, 0.3, 0.5, 'square');
            break;

        case 'horse':
            // 傌/馬: Stampede (Multiple random impacts)
            const playHoof = (delay: number) => {
                setTimeout(() => {
                     this.playNoise('bandpass', 300, 5, 0.1, 0.3);
                     this.playFM(100, 50, 50, 0.1, 0.2, 'square');
                }, delay);
            };
            [0, 150, 200, 400, 550, 600, 900, 1050, 1100].forEach(d => playHoof(d));
            break;

        case 'cannon':
            // 炮/砲: Mortar Whistle + Explosion
            const whistle = this.ctx!.createOscillator();
            whistle.type = 'sine';
            whistle.frequency.setValueAtTime(1200, t);
            whistle.frequency.exponentialRampToValueAtTime(200, t + 0.4);
            const whGain = this.ctx!.createGain();
            whGain.gain.setValueAtTime(0.3, t);
            whGain.gain.linearRampToValueAtTime(0, t + 0.4);
            whistle.connect(whGain); whGain.connect(this.sfxGain!);
            whistle.start();
            setTimeout(() => {
                this.playNoise('lowpass', 150, 0, 1.5, 1.0);
                this.playFM(60, 30, 100, 1.5, 0.8, 'square');
            }, 400);
            break;

        case 'soldier':
            // 兵/卒: Sword Clash (High Freq FM)
            this.playFM(1200, 1876, 3000, 0.1, 0.6, 'sine');
            this.playFM(2500, 500, 500, 1.5, 0.3, 'sine');
            break;
    }
  }

  playWin() {
    this.stopBGM();
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 523.25, 523.25, 523.25, 415.30, 466.16, 523.25, 466.16, 523.25]; // C C C C G# Bb C Bb C
    const times = [0, 0.15, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1];
    
    notes.forEach((freq, i) => {
        setTimeout(() => {
            this.playFM(freq, freq * 0.5, 200, 0.5, 0.4, 'sawtooth');
        }, times[i] * 1000);
    });
  }

  playKO() {
    this.stopBGM();
    if (this.isMuted) return;
    this.init();
    this.playNoise('lowpass', 50, 1, 3.0, 1.0);
    this.playFM(50, 20, 500, 3.0, 1.0, 'sawtooth');
  }
}

export const soundManager = new SoundManager();
