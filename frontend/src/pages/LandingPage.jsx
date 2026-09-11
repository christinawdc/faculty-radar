import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TerminalText from '../components/TerminalText';
import { useApi } from '../hooks/useTracking';

const BOOT_LINES = [
  { text: '> FACULTY SIGNAL v1.0.0', prefix: '', status: 'info' },
  { text: 'INITIALIZING CORE SYSTEMS...', prefix: '[SYS]', status: 'default' },
  { text: 'NETWORK ADAPTER: CONNECTED', prefix: '[NET]', status: 'success' },
  { text: 'ENCRYPTION MODULE: AES-256', prefix: '[SEC]', status: 'success' },
  { text: 'TARGET ACQUISITION MODULE: LOADED', prefix: '[TGT]', status: 'success' },
  { text: 'GEOLOCATION SERVICE: STANDBY', prefix: '[GEO]', status: 'warning' },
  { text: 'RADAR HUD: CALIBRATED', prefix: '[HUD]', status: 'success' },
  { text: 'PROXIMITY SENSORS: ONLINE', prefix: '[PRX]', status: 'success' },
  { text: '', prefix: '', status: 'default' },
  { text: 'ALL SYSTEMS OPERATIONAL', prefix: '[✓]', status: 'success' },
  { text: 'AWAITING OPERATOR COMMAND...', prefix: '[>]', status: 'info' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const api = useApi();
  const [bootComplete, setBootComplete] = useState(false);
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [targetName, setTargetName] = useState('SARJU SIR');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBootComplete = useCallback(() => {
    setTimeout(() => setBootComplete(true), 500);
  }, []);

  const handleCreateSession = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await api.createSession(targetName || 'SARJU SIR');
      navigate(`/tracker?session=${session.session_id}`);
    } catch (e) {
      setError('FAILED TO INITIALIZE SESSION — CHECK NETWORK');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionId.trim()) {
      setError('SESSION CODE REQUIRED');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formatted = sessionId.toUpperCase().trim();
      await api.getSession(formatted);
      navigate(`/share/${formatted}`);
    } catch (e) {
      setError('SESSION NOT FOUND — TARGET HAS VANISHED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,255,200,0.03)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,200,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,200,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute left-0 right-0 h-px bg-emerald-400/20"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Logo / Title */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-wider text-white mb-2">
            <span className="text-emerald-400">FACULTY</span>{' '}
            <span className="text-white/90">SIGNAL</span>
          </h1>
          <div className="text-xs font-mono tracking-[0.3em] text-emerald-400/40 uppercase">
            Advanced Faculty Tracking System
          </div>
        </motion.div>

        {/* Terminal boot sequence */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-emerald-400/10 rounded-xl p-5 mb-6 shadow-2xl shadow-emerald-400/5">
          {/* Terminal header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-400/10">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-[10px] font-mono text-gray-600 tracking-wider">
              faculty_signal — system_init
            </span>
          </div>

          <TerminalText
            lines={BOOT_LINES}
            speed={35}
            lineDelay={200}
            onComplete={handleBootComplete}
          />
        </div>

        {/* Action panel — appears after boot */}
        {bootComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {!mode ? (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('create')}
                  className="w-full py-4 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 hover:border-emerald-400/50 rounded-xl font-mono text-emerald-400 tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-emerald-400/10 text-sm"
                >
                  ▶ INITIALIZE TRACKER
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl font-mono text-gray-400 tracking-wider transition-all duration-300 text-sm"
                >
                  📡 JOIN SESSION (FACULTY)
                </button>
              </div>
            ) : mode === 'create' ? (
              <div className="space-y-4 bg-gray-900/60 backdrop-blur-sm border border-emerald-400/10 rounded-xl p-5">
                <div className="text-xs font-mono text-emerald-400/50 tracking-widest uppercase mb-2">
                  Configure Target
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase block mb-1.5">
                    Target Name
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value.toUpperCase())}
                    placeholder="TARGET NAME"
                    className="w-full bg-gray-800/80 border border-emerald-400/20 rounded-lg px-4 py-3 font-mono text-white text-sm tracking-wider focus:outline-none focus:border-emerald-400/50 placeholder-gray-600 transition-colors"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-xs font-mono tracking-wider">
                    ✗ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setMode(null); setError(''); }}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-gray-400 text-sm tracking-wider hover:bg-white/10 transition-colors"
                  >
                    ← BACK
                  </button>
                  <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 rounded-lg font-mono text-emerald-400 text-sm tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'INITIALIZING...' : '▶ LAUNCH TRACKER'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-gray-900/60 backdrop-blur-sm border border-emerald-400/10 rounded-xl p-5">
                <div className="text-xs font-mono text-cyan-400/50 tracking-widest uppercase mb-2">
                  Join Existing Session
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 tracking-widest uppercase block mb-1.5">
                    Session Code
                  </label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                    placeholder="FS-XXXX"
                    maxLength={7}
                    className="w-full bg-gray-800/80 border border-cyan-400/20 rounded-lg px-4 py-3 font-mono text-white text-sm tracking-[0.3em] text-center text-xl focus:outline-none focus:border-cyan-400/50 placeholder-gray-600 transition-colors"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-xs font-mono tracking-wider">
                    ✗ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setMode(null); setError(''); }}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-gray-400 text-sm tracking-wider hover:bg-white/10 transition-colors"
                  >
                    ← BACK
                  </button>
                  <button
                    onClick={handleJoinSession}
                    disabled={loading}
                    className="flex-1 py-3 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg font-mono text-cyan-400 text-sm tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'CONNECTING...' : '📡 CONNECT'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 text-center text-[10px] font-mono text-gray-700 tracking-wider"
        >
          FACULTY SIGNAL™ — FOR EDUCATIONAL PURPOSES ONLY
          <br />
          NO ACTUAL MALWARE. WE PROMISE.
        </motion.div>
      </motion.div>
    </div>
  );
}
