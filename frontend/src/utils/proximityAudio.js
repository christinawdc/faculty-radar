import helloMotoFile from '../assets/Hello moto ringtone.mp3';

/**
 * Proximity Audio Controller
 * Handles distance-scaled audio feedback:
 * - "SARJU SIR" / "SARJU": Plays the iconic Hello Moto ringtone, ramping playback rate & ring frequency as distance closes.
 * - Other targets: High-tech synth radar alarm beep that beeps progressively faster as distance closes.
 */
class ProximityAudioManager {
  constructor() {
    this.audioContext = null;
    this.helloMotoAudio = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.currentTarget = '';
    this.currentDistance = null;
    this.beepTimer = null;
    this.isSarjuTarget = false;
    this.gainNode = null;
  }

  // Initialize Web Audio context on user interaction
  initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (!this.helloMotoAudio) {
      try {
        this.helloMotoAudio = new Audio(helloMotoFile);
        this.helloMotoAudio.loop = true;
        this.helloMotoAudio.volume = 0.8;
      } catch (err) {
        console.warn('Could not initialize Hello Moto audio file:', err);
      }
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    } else {
      this.initAudioContext();
      if (this.currentDistance !== null) {
        this.update(this.currentTarget, this.currentDistance, true);
      }
    }
  }

  /**
   * Update audio state based on target name and current distance
   * @param {string} targetName - e.g. "SARJU SIR"
   * @param {number|null} distance - Distance in meters
   * @param {boolean} isActive - Whether tracking is currently active
   */
  update(targetName, distance, isActive) {
    this.currentTarget = targetName || '';
    this.currentDistance = distance;
    this.isSarjuTarget = this.currentTarget.toUpperCase().includes('SARJU');

    if (this.isMuted || !isActive || distance === null || distance === undefined) {
      this.stop();
      return;
    }

    this.initAudioContext();

    if (this.isSarjuTarget) {
      this.playHelloMoto(distance);
    } else {
      this.playGenericRadarBeep(distance);
    }
  }

  /**
   * Play Hello Moto with dynamic playback speed based on distance
   * Range: 500m -> 0.9x speed, 10m -> 2.2x speed
   */
  playHelloMoto(distance) {
    // Stop synth beeper if it was running
    this.stopBeepTimer();

    if (!this.helloMotoAudio) {
      // Fallback to synth if audio file cannot be loaded
      this.playGenericRadarBeep(distance);
      return;
    }

    // Calculate playback speed: 500m+ => 0.95x, 250m => 1.1x, 100m => 1.3x, 50m => 1.5x, 20m => 1.8x, <=10m => 2.2x
    let speed = 1.0;
    if (distance > 300) {
      speed = 0.95;
    } else if (distance > 150) {
      speed = 1.15;
    } else if (distance > 75) {
      speed = 1.35;
    } else if (distance > 30) {
      speed = 1.6;
    } else if (distance > 10) {
      speed = 1.9;
    } else {
      speed = 2.2;
    }

    // Set audio playback speed
    this.helloMotoAudio.playbackRate = speed;
    this.helloMotoAudio.preservesPitch = false; // Higher pitch as it speeds up for urgency!

    if (this.helloMotoAudio.paused) {
      this.helloMotoAudio.play().catch((e) => {
        // Autoplay may be restricted until user interacts with document
        console.log('Audio playback waiting for user gesture:', e.message);
      });
    }
    this.isPlaying = true;
  }

  /**
   * Synthesize radar alarm beeps via Web Audio API
   * Ping interval speeds up as distance closes
   */
  playGenericRadarBeep(distance) {
    // Pause Hello Moto if it was playing
    if (this.helloMotoAudio && !this.helloMotoAudio.paused) {
      this.helloMotoAudio.pause();
    }

    // Calculate beep interval in ms
    // 500m -> 2000ms, 250m -> 1200ms, 100m -> 600ms, 50m -> 300ms, 15m -> 120ms
    let intervalMs = 1500;
    if (distance > 400) {
      intervalMs = 2000;
    } else if (distance > 200) {
      intervalMs = 1200;
    } else if (distance > 100) {
      intervalMs = 700;
    } else if (distance > 50) {
      intervalMs = 400;
    } else if (distance > 20) {
      intervalMs = 220;
    } else {
      intervalMs = 110;
    }

    if (this.beepInterval !== intervalMs) {
      this.beepInterval = intervalMs;
      this.stopBeepTimer();
      this.beepTimer = setInterval(() => {
        this.triggerSynthBeep(distance);
      }, intervalMs);
      // Trigger first beep immediately
      this.triggerSynthBeep(distance);
    }
    this.isPlaying = true;
  }

  triggerSynthBeep(distance) {
    if (this.isMuted || !this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Higher frequency when closer
      const baseFreq = distance < 30 ? 1200 : distance < 100 ? 950 : 750;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = distance < 30 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Error playing synth beep:', e);
    }
  }

  stopBeepTimer() {
    if (this.beepTimer) {
      clearInterval(this.beepTimer);
      this.beepTimer = null;
      this.beepInterval = null;
    }
  }

  stop() {
    this.stopBeepTimer();
    if (this.helloMotoAudio) {
      this.helloMotoAudio.pause();
      this.helloMotoAudio.currentTime = 0;
    }
    this.isPlaying = false;
  }
}

export const proximityAudio = new ProximityAudioManager();
export default proximityAudio;
