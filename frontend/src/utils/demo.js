/**
 * Demo Mode — Simulates target movement for testing/judging
 */

export const DEMO_PATTERNS = {
  ORBIT: 'orbit',
  APPROACH: 'approach',
  CARDINAL_SWEEP: 'cardinal_sweep',
  WANDER: 'wander',
};

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Create a demo target simulator
 */
export function createDemoSimulator(
  centerLat = 23.0225,
  centerLon = 72.5714,
  pattern = DEMO_PATTERNS.CARDINAL_SWEEP
) {
  let tick = 0;
  const startTime = Date.now();
  const mToLat = 1 / 111000;
  const mToLon = 1 / (111000 * Math.cos((centerLat * Math.PI) / 180));

  return {
    patterns: DEMO_PATTERNS,
    currentPattern: pattern,

    setPattern(p) {
      this.currentPattern = p;
      tick = 0;
    },

    getNextPosition() {
      tick++;
      const t = tick * 0.02;

      let offsetN = 0;
      let offsetE = 0;
      let speed = 0;
      let heading = 0;

      switch (this.currentPattern) {
        case DEMO_PATTERNS.ORBIT: {
          const radius = 150 + 100 * Math.sin(t * 0.3);
          offsetN = radius * Math.cos(t);
          offsetE = radius * Math.sin(t);
          speed = 1.2 + Math.random() * 0.5;
          heading = (toDeg(Math.atan2(Math.cos(t), -Math.sin(t))) + 360) % 360;
          break;
        }
        case DEMO_PATTERNS.APPROACH: {
          const cycle = (t * 0.5) % (2 * Math.PI);
          const distance = 20 + 480 * Math.abs(Math.cos(cycle * 0.5));
          const angle = t * 0.1;
          offsetN = distance * Math.cos(angle);
          offsetE = distance * Math.sin(angle);
          speed = 1.5 + Math.random();
          heading = (toDeg(Math.atan2(offsetE, offsetN)) + 180) % 360;
          break;
        }
        case DEMO_PATTERNS.CARDINAL_SWEEP: {
          const sweepAngle = t * 0.5;
          const distance = 180 + 80 * Math.sin(t * 0.7);
          offsetN = distance * Math.cos(sweepAngle);
          offsetE = distance * Math.sin(sweepAngle);
          speed = 1.0 + Math.random() * 0.8;
          heading = (toDeg(sweepAngle) + 360) % 360;
          break;
        }
        case DEMO_PATTERNS.WANDER: {
          offsetN = 200 * Math.sin(t * 0.3) + 50 * Math.sin(t * 1.1) + 30 * Math.cos(t * 2.3);
          offsetE = 200 * Math.cos(t * 0.4) + 50 * Math.cos(t * 0.9) + 30 * Math.sin(t * 1.7);
          speed = 0.5 + Math.random() * 2;
          heading = (toDeg(Math.atan2(offsetE, offsetN)) + 360) % 360;
          break;
        }
        default:
          offsetN = 100;
          offsetE = 100;
      }

      const latitude = centerLat + offsetN * mToLat;
      const longitude = centerLon + offsetE * mToLon;
      const signal = Math.min(99, Math.max(20, 75 + 20 * Math.sin(t * 0.5) + Math.random() * 10));

      return {
        latitude,
        longitude,
        accuracy: 10 + Math.random() * 30,
        heading,
        speed,
        movement_status: speed > 0.3 ? 'MOVING' : 'STATIONARY',
        signal_strength: Math.round(signal),
      };
    },
  };
}
