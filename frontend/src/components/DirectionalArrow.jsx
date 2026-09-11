import { motion } from 'framer-motion';

/**
 * Large animated directional arrow pointing toward target
 */
export default function DirectionalArrow({
  bearing = 0,
  hasCompass = false,
  proximityState,
  className = '',
}) {
  const color = proximityState?.color || '#00ffcc';

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Compass mode indicator */}
      {!hasCompass && (
        <div className="text-xs font-mono text-gray-500 tracking-wider uppercase">
          Map-relative direction
        </div>
      )}

      {/* Arrow container */}
      <motion.div
        className="relative"
        animate={{ rotate: bearing }}
        transition={{
          type: 'spring',
          stiffness: 60,
          damping: 15,
          mass: 1,
        }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ background: color }}
        />

        {/* Arrow SVG */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="relative z-10 drop-shadow-2xl"
        >
          {/* Glow filter */}
          <defs>
            <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.6" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Arrow shape pointing UP (0° = straight ahead) */}
          <path
            d="M60 10 L85 80 L60 65 L35 80 Z"
            fill="url(#arrowGrad)"
            filter="url(#arrowGlow)"
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* Center dot */}
          <circle cx="60" cy="60" r="3" fill={color} opacity="0.6" />
        </svg>
      </motion.div>

      {/* Pulsing ring behind arrow */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{ borderColor: color, width: 140, height: 140 }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: proximityState?.pulseSpeed || 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
