import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = {
  SEARCHING: [
    'SCANNING FOR FACULTY SIGNAL...',
    'BROADENING SEARCH RADIUS...',
    'ACTIVATING LONG-RANGE SENSORS...',
    'SIGNAL LOST — THEY\'RE HIDING',
  ],
  DETECTED: [
    'FACULTY SIGNAL DETECTED',
    'TARGET IDENTIFIED',
    'PROFESSOR WITHIN RANGE',
    'BIO-SIGNATURE CONFIRMED',
  ],
  APPROACHING: [
    'MOVEMENT DETECTED',
    'TARGET IS APPROACHING',
    'SIGNAL GETTING HOTTER',
    'CLOSING IN ON TARGET',
  ],
  PROXIMITY: [
    'FACULTY PROXIMITY WARNING',
    'DO NOT MAKE EYE CONTACT',
    'ATTENDANCE THREAT LEVEL: HIGH',
    'PREPARE FOR ENCOUNTER',
  ],
  VERY_CLOSE: [
    'TARGET ACQUIRED',
    'FACULTY VERY CLOSE',
    'BRACE YOURSELF',
    'HOD DETECTED',
  ],
  ACQUIRED: [
    'TARGET ACQUIRED — MISSION COMPLETE',
    'THEY\'RE RIGHT THERE',
    'NOWHERE TO RUN',
    'GAME OVER',
  ],
  MOVING: [
    'TARGET IS ON THE MOVE',
    'MOVEMENT DETECTED',
    'TARGET IS ESCAPING',
    'EVASIVE MANEUVERS DETECTED',
  ],
  STATIONARY: [
    'TARGET IS STATIONARY',
    'THEY\'VE STOPPED MOVING',
    'HOLDING POSITION',
    'TARGET ANCHORED',
  ],
  FAR: [
    'TARGET OUT OF RANGE',
    'SIGNAL FADING...',
    'THEY COULD BE ANYWHERE',
    'EXPANDING SEARCH ZONE',
  ],
};

/**
 * Randomly cycling humorous status messages
 */
export default function StatusMessages({
  proximityLevel = 'SEARCHING',
  movementStatus = 'UNKNOWN',
  interval = 5000,
  className = '',
}) {
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    const pickMessage = () => {
      // Pick from proximity or movement pool
      let pool = MESSAGES[proximityLevel] || MESSAGES.SEARCHING;

      // Occasionally mix in movement messages
      if (movementStatus === 'MOVING' && Math.random() > 0.5) {
        pool = MESSAGES.MOVING;
      } else if (movementStatus === 'STATIONARY' && Math.random() > 0.7) {
        pool = MESSAGES.STATIONARY;
      }

      const msg = pool[Math.floor(Math.random() * pool.length)];
      setMessage(msg);
      setKey((k) => k + 1);
    };

    pickMessage();
    const timer = setInterval(pickMessage, interval);

    return () => clearInterval(timer);
  }, [proximityLevel, movementStatus, interval]);

  return (
    <div className={`font-mono text-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ duration: 0.4 }}
          className="text-xs tracking-[0.2em] uppercase text-emerald-400/70"
        >
          {message}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
