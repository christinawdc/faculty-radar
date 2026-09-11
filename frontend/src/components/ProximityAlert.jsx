import { motion, AnimatePresence } from 'framer-motion';

/**
 * Visual proximity alert with color-coded states
 */
export default function ProximityAlert({
  proximityState,
  isActive = false,
  className = '',
}) {
  if (!isActive || !proximityState) return null;

  const showAlert =
    proximityState.level === 'ACQUIRED' ||
    proximityState.level === 'VERY_CLOSE' ||
    proximityState.level === 'PROXIMITY';

  return (
    <AnimatePresence>
      {showAlert && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`text-center ${className}`}
        >
          {/* Flashing alert */}
          <motion.div
            animate={{
              opacity: [1, 0.3, 1],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: proximityState.pulseSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="font-mono font-bold text-lg tracking-widest py-2 px-4 rounded-lg border"
            style={{
              color: proximityState.color,
              borderColor: proximityState.color + '40',
              backgroundColor: proximityState.color + '10',
              textShadow: `0 0 20px ${proximityState.color}80`,
            }}
          >
            ⚠ {proximityState.label} ⚠
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
