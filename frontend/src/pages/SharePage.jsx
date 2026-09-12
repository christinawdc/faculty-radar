import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalText from '../components/TerminalText';
import { useGeolocation, useApi } from '../hooks/useTracking';

const ACTIVATION_LINES = [
  { text: '> FACULTY SIGNAL — TARGET MODULE', prefix: '', status: 'info' },
  { text: 'ESTABLISHING SECURE CHANNEL...', prefix: '[NET]', status: 'default' },
  { text: 'ENCRYPTION: ACTIVE', prefix: '[SEC]', status: 'success' },
  { text: 'SESSION LINK: VERIFIED', prefix: '[SES]', status: 'success' },
  { text: 'TARGET MODULE: ACTIVATED', prefix: '[TGT]', status: 'success' },
  { text: '', prefix: '', status: 'default' },
  { text: 'LOCATION SERVICE: AWAITING AUTHORIZATION', prefix: '[GEO]', status: 'warning' },
  { text: '', prefix: '', status: 'default' },
  { text: '⚠ EXPLICIT PERMISSION REQUIRED TO PROCEED', prefix: '', status: 'warning' },
];

const SHARING_LINES = [
  { text: 'LOCATION PERMISSION: GRANTED', prefix: '[GEO]', status: 'success' },
  { text: 'TARGET SIGNAL: ACTIVE', prefix: '[SIG]', status: 'success' },
  { text: 'LOCATION LINK: ESTABLISHED', prefix: '[LNK]', status: 'success' },
  { text: 'STATUS: TRANSMITTING', prefix: '[TX]', status: 'info' },
];

export default function SharePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { position, error: geoError, watching, startWatching, stopWatching } = useGeolocation();

  const [phase, setPhase] = useState('boot'); // boot | permission | sharing | stopped | error
  const [sessionInfo, setSessionInfo] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  // Join session on mount
  useEffect(() => {
    const join = async () => {
      try {
        const info = await api.joinSession(sessionId);
        setSessionInfo(info);
      } catch (e) {
        setJoinError(e.message || 'SESSION NOT FOUND');
        setPhase('error');
      }
    };
    join();
  }, [sessionId]);

  // Countdown timer with timezone-safe UTC parsing
  useEffect(() => {
    if (!sessionInfo?.expires_at) return;

    const parseUtcDate = (dateStr) => {
      if (!dateStr) return null;
      const s = String(dateStr);
      const formatted = s.endsWith('Z') || s.includes('+') ? s : `${s}Z`;
      return new Date(formatted);
    };

    const updateTimer = () => {
      const expires = parseUtcDate(sessionInfo.expires_at);
      if (!expires || isNaN(expires.getTime())) return;

      const remaining = expires.getTime() - Date.now();
      if (remaining <= 0) {
        setPhase('stopped');
        stopWatching();
        setTimeRemaining(null);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionInfo, stopWatching]);

  // Send location updates
  useEffect(() => {
    if (phase !== 'sharing' || !watching || !position) return;

    const sendUpdate = async () => {
      try {
        await api.sendLocation(sessionId, {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          heading: position.heading,
          speed: position.speed,
        });
        setUpdateCount((c) => c + 1);
      } catch (e) {
        console.error('Failed to send location:', e);
      }
    };

    // Send immediately
    sendUpdate();

    // Then every 3 seconds
    intervalRef.current = setInterval(sendUpdate, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, watching, position, sessionId]);

  const handleRequestPermission = useCallback(() => {
    startWatching();
    setPhase('sharing');
  }, [startWatching]);

  const handleStopSharing = async () => {
    stopWatching();
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      await api.stopSharing(sessionId);
    } catch (e) {
      console.error('Failed to notify server:', e);
    }
    setPhase('stopped');
  };

  // Handle geolocation errors
  useEffect(() => {
    if (geoError && phase === 'sharing') {
      // Don't stop sharing, just show error
    }
  }, [geoError, phase]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,200,255,0.03)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-mono tracking-wider text-white mb-1">
            <span className="text-cyan-400">FACULTY</span> SIGNAL
          </h1>
          <div className="text-xs font-mono text-cyan-400/40 tracking-[0.2em]">
            TARGET MODULE — SESSION {sessionId}
          </div>
        </div>

        {/* Error state */}
        {phase === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-900/80 backdrop-blur-sm border border-red-400/20 rounded-xl p-6 text-center"
          >
            <div className="text-4xl mb-4">🚫</div>
            <div className="text-red-400 font-mono text-lg tracking-wider mb-2">
              SESSION ERROR
            </div>
            <div className="text-gray-400 font-mono text-sm mb-4">
              {joinError || 'Unable to connect to session'}
            </div>
            <div className="text-gray-600 text-xs font-mono mb-6">
              "Sir has chosen to remain off the grid."
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-gray-400 text-sm tracking-wider hover:bg-white/10 transition-colors"
            >
              ← RETURN TO BASE
            </button>
          </motion.div>
        )}

        {/* Boot phase */}
        {phase === 'boot' && (
          <div className="bg-gray-900/80 backdrop-blur-sm border border-cyan-400/10 rounded-xl p-5 mb-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-400/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
                <span className="ml-2 text-[10px] font-mono text-gray-600 tracking-wider">
                  target_module — activation
                </span>
              </div>
              <button
                onClick={() => setPhase('permission')}
                className="text-[10px] font-mono text-cyan-400/70 hover:text-cyan-300 tracking-widest uppercase hover:underline"
              >
                SKIP »
              </button>
            </div>

            <TerminalText
              lines={ACTIVATION_LINES}
              speed={5}
              lineDelay={15}
              onComplete={() => setPhase('permission')}
            />
          </div>
        )}

        {/* Permission request */}
        {phase === 'permission' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-gray-900/80 backdrop-blur-sm border border-cyan-400/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-400/10">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
              </div>

              <TerminalText
                lines={ACTIVATION_LINES}
                speed={0}
                lineDelay={0}
                showCursor={false}
              />
            </div>

            <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-5 text-center">
              <div className="text-amber-400 font-mono text-sm tracking-wider mb-3">
                ⚠ LOCATION ACCESS REQUIRED ⚠
              </div>
              <div className="text-gray-400 text-xs font-mono mb-1 leading-relaxed">
                This app needs your browser location to function.
              </div>
              <div className="text-gray-500 text-[10px] font-mono mb-4 leading-relaxed">
                Your approximate location will be shared with the tracker session.
                <br />
                You can stop sharing at any time.
              </div>
              <button
                onClick={handleRequestPermission}
                className="w-full py-4 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 hover:border-cyan-400/50 rounded-xl font-mono text-cyan-400 tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/10 text-sm"
              >
                📡 AUTHORIZE LOCATION ACCESS
              </button>
            </div>
          </motion.div>
        )}

        {/* Active sharing */}
        {phase === 'sharing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Status terminal */}
            <div className="bg-gray-900/80 backdrop-blur-sm border border-emerald-400/10 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-400/10">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[10px] font-mono text-gray-600 tracking-wider">
                  target_module — transmitting
                </span>
              </div>

              <TerminalText
                lines={SHARING_LINES}
                speed={0}
                lineDelay={0}
                showCursor={false}
              />
            </div>

            {/* Active signal indicator */}
            <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-6 text-center">
              {/* Pulsing signal icon */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-16 h-16 rounded-full border-2 border-emerald-400"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute w-16 h-16 rounded-full border-2 border-emerald-400"
                />
                <div className="w-16 h-16 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <span className="text-2xl">📡</span>
                </div>
              </div>

              <div className="text-emerald-400 font-mono text-lg tracking-widest font-bold mb-2">
                SIGNAL ACTIVE
              </div>
              <div className="text-gray-400 font-mono text-xs tracking-wider">
                Your location is being transmitted
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-900/60 rounded-lg p-3">
                  <div className="text-[10px] font-mono text-gray-600 tracking-wider">UPDATES SENT</div>
                  <div className="text-emerald-400 font-mono text-lg font-bold">{updateCount}</div>
                </div>
                <div className="bg-gray-900/60 rounded-lg p-3">
                  <div className="text-[10px] font-mono text-gray-600 tracking-wider">TIME LEFT</div>
                  <div className="text-amber-400 font-mono text-lg font-bold">{timeRemaining || '--:--'}</div>
                </div>
              </div>

              {/* Geolocation errors */}
              {geoError && (
                <div className="mt-3 text-red-400/70 text-xs font-mono">
                  ⚠ GPS issue: {
                    geoError.code === 1 ? '"Sir has chosen to remain off the grid."' :
                    geoError.code === 2 ? 'Location unavailable — are you indoors?' :
                    geoError.code === 3 ? 'GPS timeout — trying again...' :
                    'Unknown location error'
                  }
                </div>
              )}

              {/* Accuracy info */}
              {position && (
                <div className="mt-2 text-[10px] font-mono text-gray-600">
                  Accuracy: ±{Math.round(position.accuracy || 0)}m
                </div>
              )}
            </div>

            {/* STOP button */}
            <motion.button
              onClick={handleStopSharing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/40 hover:border-red-500/60 rounded-xl font-mono text-red-400 text-lg tracking-widest font-bold transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
            >
              ■ STOP SHARING LOCATION
            </motion.button>
          </motion.div>
        )}

        {/* Stopped state */}
        {phase === 'stopped' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/30 rounded-xl p-8 text-center"
          >
            <div className="text-4xl mb-4">🔒</div>
            <div className="text-white font-mono text-lg tracking-wider mb-2">
              TRANSMISSION ENDED
            </div>
            <div className="text-gray-400 font-mono text-sm mb-1">
              Location sharing has been stopped.
            </div>
            <div className="text-gray-600 font-mono text-xs mb-6">
              All location data will be purged when the session expires.
            </div>
            <button
              onClick={() => navigate('/session-ended')}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-gray-400 text-sm tracking-wider hover:bg-white/10 transition-colors"
            >
              VIEW SESSION SUMMARY →
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-[10px] font-mono text-gray-800 tracking-wider">
          YOUR DATA IS ONLY USED FOR THIS DEMO SESSION
        </div>
      </motion.div>
    </div>
  );
}
