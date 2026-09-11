import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TerminalText from '../components/TerminalText';

const SHUTDOWN_LINES = [
  { text: '> INITIATING SYSTEM SHUTDOWN...', prefix: '', status: 'info' },
  { text: 'CLOSING WEBSOCKET CONNECTIONS...', prefix: '[NET]', status: 'default' },
  { text: 'CONNECTIONS: TERMINATED', prefix: '[NET]', status: 'success' },
  { text: 'PURGING SESSION DATA...', prefix: '[DAT]', status: 'default' },
  { text: 'LOCATION HISTORY: DELETED', prefix: '[DAT]', status: 'success' },
  { text: 'TARGET COORDINATES: WIPED', prefix: '[DAT]', status: 'success' },
  { text: 'SESSION TOKENS: REVOKED', prefix: '[SEC]', status: 'success' },
  { text: 'DISABLING TRACKING MODULES...', prefix: '[TGT]', status: 'default' },
  { text: 'RADAR: OFFLINE', prefix: '[HUD]', status: 'success' },
  { text: 'PROXIMITY SENSORS: DISABLED', prefix: '[PRX]', status: 'success' },
  { text: '', prefix: '', status: 'default' },
  { text: 'ALL FACULTY DATA PURGED', prefix: '[✓]', status: 'success' },
  { text: 'SYSTEM SHUTDOWN COMPLETE', prefix: '[✓]', status: 'success' },
];

const FUNNY_MESSAGES = [
  "No faculty members were harmed in this demo.",
  "All coordinates have been yeeted into the void.",
  "Your professor can roam free once again.",
  "The faculty member's GPS dignity has been restored.",
  "Big Brother has left the building.",
  "Faculty tracking privileges: REVOKED",
  "Remember: attendance is a state of mind.",
];

export default function SessionEndedPage() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [funnyMessage] = useState(
    FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(100,100,100,0.03)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold font-mono tracking-wider text-white/50 mb-2">
            FACULTY SIGNAL
          </h1>
          <div className="text-xs font-mono tracking-[0.3em] text-gray-700 uppercase">
            System Shutdown
          </div>
        </motion.div>

        {/* Shutdown terminal */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/20 rounded-xl p-5 mb-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700/20">
            <div className="w-3 h-3 rounded-full bg-red-400/40" />
            <div className="w-3 h-3 rounded-full bg-amber-400/40" />
            <div className="w-3 h-3 rounded-full bg-gray-500/40" />
            <span className="ml-2 text-[10px] font-mono text-gray-700 tracking-wider">
              faculty_signal — shutdown
            </span>
          </div>

          <TerminalText
            lines={SHUTDOWN_LINES}
            speed={25}
            lineDelay={150}
            onComplete={() => setTimeout(() => setShowContent(true), 500)}
          />
        </div>

        {/* Post-shutdown content */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {/* Shutdown badge */}
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="text-7xl mb-4 inline-block"
              >
                🔒
              </motion.div>

              <h2 className="text-xl font-mono font-bold text-white tracking-wider mb-2">
                SESSION TERMINATED
              </h2>

              <div className="text-sm font-mono text-emerald-400/60 mb-4">
                All tracking data has been permanently deleted.
              </div>

              <div className="text-xs font-mono text-gray-600 italic">
                "{funnyMessage}"
              </div>
            </div>

            {/* Data confirmation */}
            <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-xl p-4">
              <div className="text-[10px] font-mono text-emerald-400/50 tracking-widest uppercase mb-3">
                Cleanup Confirmation
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  'Location data: DELETED',
                  'Session tokens: REVOKED',
                  'WebSocket connections: CLOSED',
                  'Target coordinates: WIPED',
                  'Tracking history: PURGED',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-emerald-400/60"
                  >
                    <span className="text-emerald-400">✓</span>
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono text-gray-400 text-sm tracking-wider transition-all"
              >
                ← RETURN TO BASE
              </button>
              <button
                onClick={() => navigate('/tracker')}
                className="flex-1 py-3 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 rounded-xl font-mono text-emerald-400 text-sm tracking-wider transition-all"
              >
                NEW SESSION →
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] font-mono text-gray-800 tracking-wider">
          NO FACULTY MEMBERS WERE TRACKED BEYOND THIS DEMO
        </div>
      </motion.div>
    </div>
  );
}
