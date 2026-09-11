import { motion } from 'framer-motion';
import professorAvatar from '../assets/professor_avatar.jpg';

/**
 * Target information panel showing avatar, name, distance, direction, etc.
 */
export default function TargetInfo({
  targetName = 'UNKNOWN',
  distance = null,
  distanceLabel = '---',
  direction = null,
  signalStrength = 0,
  movementStatus = 'UNKNOWN',
  connectionStatus = 'DISCONNECTED',
  lastUpdate = null,
  proximityState = null,
}) {
  const formatTime = (isoString) => {
    if (!isoString) return '--:--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  const signalBars = Math.ceil(signalStrength / 20); // 0-5 bars

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Target identity */}
      <div className="flex items-center gap-4 mb-6">
        {/* Avatar */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-md opacity-40"
            style={{ background: proximityState?.color || '#00ffcc' }}
          />
          <img
            src={professorAvatar}
            alt="Target"
            className="w-14 h-14 rounded-full border-2 relative z-10 object-cover"
            style={{ borderColor: proximityState?.color || '#00ffcc' }}
          />
          {/* Online indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-900 z-20 ${
              connectionStatus === 'CONNECTED' ? 'bg-emerald-400' : 'bg-gray-600'
            }`}
          />
        </div>

        {/* Name & status */}
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wider text-white">
            {targetName}
          </h2>
          <div
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: proximityState?.color || '#00ffcc' }}
          >
            {proximityState?.label || 'STANDBY'}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distance */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">
            Distance
          </div>
          <div
            className="text-lg font-mono font-bold"
            style={{ color: proximityState?.color || '#00ffcc' }}
          >
            {distanceLabel}
          </div>
        </div>

        {/* Direction */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">
            Direction
          </div>
          <div className="text-lg font-mono font-bold text-white flex items-center gap-2">
            {direction ? (
              <>
                <span className="text-2xl">{direction.arrow}</span>
                <span>{direction.label}</span>
              </>
            ) : (
              <span className="text-gray-600">---</span>
            )}
          </div>
        </div>

        {/* Signal strength */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">
            Signal
          </div>
          <div className="flex items-center gap-2">
            {/* Signal bars */}
            <div className="flex items-end gap-0.5 h-5">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className="w-1.5 rounded-sm transition-all duration-300"
                  style={{
                    height: `${bar * 4}px`,
                    background:
                      bar <= signalBars
                        ? proximityState?.color || '#00ffcc'
                        : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
            <span
              className="text-sm font-mono font-bold"
              style={{ color: proximityState?.color || '#00ffcc' }}
            >
              {signalStrength}%
            </span>
          </div>
        </div>

        {/* Movement status */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-1">
            Status
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                movementStatus === 'MOVING'
                  ? 'bg-amber-400 animate-pulse'
                  : movementStatus === 'STATIONARY'
                  ? 'bg-emerald-400'
                  : 'bg-gray-600'
              }`}
            />
            <span className="text-sm font-mono text-white">
              {movementStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-gray-600 tracking-wider">
        <span>LAST UPDATE: {formatTime(lastUpdate)}</span>
        <span
          className={
            connectionStatus === 'CONNECTED' ? 'text-emerald-400/60' : 'text-red-400/60'
          }
        >
          {connectionStatus}
        </span>
      </div>
    </motion.div>
  );
}
