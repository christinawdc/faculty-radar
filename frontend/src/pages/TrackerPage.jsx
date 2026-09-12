import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RadarHUD from '../components/RadarHUD';
import DirectionalArrow from '../components/DirectionalArrow';
import TargetInfo from '../components/TargetInfo';
import ProximityAlert from '../components/ProximityAlert';
import StatusMessages from '../components/StatusMessages';
import { useGeolocation, useDeviceOrientation, useApi } from '../hooks/useTracking';
import {
  haversineDistance,
  calculateBearing,
  getCardinalDirection,
  bucketDistance,
  getProximityState,
  getRelativeBearing,
} from '../utils/geo';
import { createDemoSimulator, DEMO_PATTERNS } from '../utils/demo';
import proximityAudio from '../utils/proximityAudio';

export default function TrackerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const api = useApi();

  const sessionIdParam = searchParams.get('session');
  const { position: trackerPosition, error: geoError, startWatching: startTrackerGeo } = useGeolocation();
  const { heading: compassHeading, supported: compassSupported, requestPermission: requestCompass } = useDeviceOrientation();

  // State
  const [sessionId, setSessionId] = useState(sessionIdParam || '');
  const [sessionActive, setSessionActive] = useState(false);
  const [targetName, setTargetName] = useState('TARGET');
  const [targetLocation, setTargetLocation] = useState(null);
  const [signalStrength, setSignalStrength] = useState(0);
  const [movementStatus, setMovementStatus] = useState('UNKNOWN');
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [facultyJoined, setFacultyJoined] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Demo mode
  const [demoMode, setDemoMode] = useState(false);
  const [demoPattern, setDemoPattern] = useState('cardinal_sweep');
  const demoSimRef = useRef(null);
  const demoIntervalRef = useRef(null);

  // Computed
  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [direction, setDirection] = useState(null);
  const [proximityState, setProximityState] = useState(null);
  const [relativeBearing, setRelativeBearing] = useState(0);

  // WebSocket
  const wsRef = useRef(null);

  // Start tracker's own geolocation
  useEffect(() => {
    startTrackerGeo();
    requestCompass();
  }, []);

  // Connect WebSocket when session is active
  useEffect(() => {
    if (!sessionId || demoMode) return;

    const connection = api.connectWebSocket(sessionId, (data) => {
      switch (data.type) {
        case 'connected':
          setConnectionStatus('CONNECTED');
          setTargetName(data.target_name || 'TARGET');
          setSessionActive(data.active);
          setFacultyJoined(data.faculty_joined);
          if (data.location) {
            setTargetLocation(data.location);
            setSignalStrength(data.signal_strength || 0);
            setMovementStatus(data.movement_status || 'UNKNOWN');
            setLastUpdate(data.last_update);
          }
          break;
        case 'location_update':
          setTargetLocation(data.location);
          setSignalStrength(data.signal_strength || 0);
          setMovementStatus(data.movement_status || 'UNKNOWN');
          setLastUpdate(data.last_update);
          break;
        case 'faculty_joined':
          setFacultyJoined(true);
          setTargetName(data.target_name || 'TARGET');
          break;
        case 'sharing_stopped':
          setTargetLocation(null);
          setSignalStrength(0);
          setMovementStatus('OFFLINE');
          setFacultyJoined(false);
          break;
        case 'session_terminated':
        case 'session_expired':
          setSessionActive(false);
          setConnectionStatus('DISCONNECTED');
          navigate('/session-ended');
          break;
        case 'disconnected':
          setConnectionStatus('DISCONNECTED');
          break;
        case 'error':
          setConnectionStatus('ERROR');
          break;
        case 'pong':
          break;
        default:
          break;
      }
    });

    wsRef.current = connection;

    return () => {
      connection.close();
    };
  }, [sessionId, demoMode]);

  // Calculate distance, bearing, direction whenever positions change
  useEffect(() => {
    const tracker = trackerPosition || (demoMode ? { latitude: 23.0225, longitude: 72.5714 } : null);
    const target = targetLocation;

    if (!tracker || !target) {
      setDistance(null);
      setBearing(0);
      setDirection(null);
      setProximityState(null);
      return;
    }

    const dist = haversineDistance(
      tracker.latitude, tracker.longitude,
      target.latitude, target.longitude
    );
    const bear = calculateBearing(
      tracker.latitude, tracker.longitude,
      target.latitude, target.longitude
    );
    const dir = getCardinalDirection(bear);
    const prox = getProximityState(dist);
    const relBear = getRelativeBearing(bear, compassHeading);

    setDistance(dist);
    setBearing(bear);
    setDirection(dir);
    setProximityState(prox);
    setRelativeBearing(relBear);
  }, [trackerPosition, targetLocation, compassHeading, demoMode]);

  // Demo mode
  const startDemo = useCallback(() => {
    const center = trackerPosition
      ? { lat: trackerPosition.latitude, lon: trackerPosition.longitude }
      : { lat: 23.0225, lon: 72.5714 }; // Ahmedabad default

    const sim = createDemoSimulator(center.lat, center.lon, demoPattern);
    demoSimRef.current = sim;

    setDemoMode(true);
    setSessionActive(true);
    setConnectionStatus('DEMO');
    setTargetName('SARJU SIR');
    setFacultyJoined(true);

    demoIntervalRef.current = setInterval(() => {
      const pos = sim.getNextPosition();
      setTargetLocation({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
      });
      setSignalStrength(pos.signal_strength);
      setMovementStatus(pos.movement_status);
      setLastUpdate(new Date().toISOString());
    }, 1000);
  }, [trackerPosition, demoPattern]);

  const stopDemo = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }
    setDemoMode(false);
    setSessionActive(false);
    setTargetLocation(null);
    setConnectionStatus('DISCONNECTED');
    setFacultyJoined(false);
  }, []);

  // Change demo pattern
  useEffect(() => {
    if (demoMode && demoSimRef.current) {
      demoSimRef.current.setPattern(demoPattern);
    }
  }, [demoPattern, demoMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      proximityAudio.stop();
    };
  }, []);

  const handleTerminate = async () => {
    proximityAudio.stop();
    if (demoMode) {
      stopDemo();
      navigate('/session-ended');
      return;
    }
    try {
      await api.terminateSession(sessionId);
    } catch (e) {
      console.error('Failed to terminate:', e);
    }
    navigate('/session-ended');
  };

  const shareUrl = sessionId
    ? `${window.location.origin}/share/${sessionId}`
    : '';

  const isActive = sessionActive && targetLocation && (facultyJoined || demoMode);

  // Sync proximity audio with target distance & active state
  useEffect(() => {
    proximityAudio.update(targetName, distance, isActive && audioEnabled);
  }, [targetName, distance, isActive, audioEnabled]);

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: proximityState
            ? `radial-gradient(ellipse at center, ${proximityState.color}06 0%, transparent 70%)`
            : 'radial-gradient(ellipse at center, rgba(0,255,200,0.02) 0%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,200,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,200,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-wider text-white">
              <span className="text-emerald-400">FACULTY</span> SIGNAL
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {sessionId && (
                <span className="text-xs font-mono text-gray-500 tracking-widest">
                  SESSION: {sessionId}
                </span>
              )}
              <span
                className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full ${
                  connectionStatus === 'CONNECTED' || connectionStatus === 'DEMO'
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : connectionStatus === 'ERROR'
                    ? 'bg-red-400/10 text-red-400'
                    : 'bg-gray-700/30 text-gray-500'
                }`}
              >
                {connectionStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            <button
              onClick={() => {
                const next = !audioEnabled;
                setAudioEnabled(next);
                proximityAudio.setMuted(!next);
              }}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider transition-all border flex items-center gap-1.5 ${
                audioEnabled
                  ? targetName.toUpperCase().includes('SARJU')
                    ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20'
                    : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20'
                  : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
              }`}
              title={
                audioEnabled
                  ? targetName.toUpperCase().includes('SARJU')
                    ? 'Hello Moto ringtone active (speeds up as you get closer)'
                    : 'Proximity alarm beep active (beeps faster as you get closer)'
                  : 'Sound is muted'
              }
            >
              <span>{audioEnabled ? '🔊' : '🔇'}</span>
              <span>
                {audioEnabled
                  ? targetName.toUpperCase().includes('SARJU')
                    ? 'HELLO MOTO'
                    : 'ALARM BEEP'
                  : 'MUTED'}
              </span>
            </button>

            {/* Demo toggle */}
            <button
              onClick={demoMode ? stopDemo : startDemo}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider transition-all border ${
                demoMode
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
              }`}
            >
              {demoMode ? '■ STOP DEMO' : '▶ DEMO MODE'}
            </button>

            {/* Terminate */}
            {(sessionActive || demoMode) && (
              <button
                onClick={handleTerminate}
                className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wider border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
              >
                TERMINATE
              </button>
            )}
          </div>
        </motion.header>

        {/* Demo pattern selector */}
        {demoMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 flex-wrap"
          >
            <span className="text-[10px] font-mono text-gray-600 tracking-wider">PATTERN:</span>
            {Object.entries(DEMO_PATTERNS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setDemoPattern(value)}
                className={`px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                  demoPattern === value
                    ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-400'
                }`}
              >
                {key}
              </button>
            ))}
          </motion.div>
        )}

        {/* Proximity Alert — top-level */}
        <ProximityAlert
          proximityState={proximityState}
          isActive={isActive}
          className="mb-4"
        />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel — Target Info (desktop) */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
              <TargetInfo
                targetName={targetName}
                distance={distance}
                distanceLabel={distance !== null ? bucketDistance(distance) : '---'}
                direction={direction}
                signalStrength={signalStrength}
                movementStatus={movementStatus}
                connectionStatus={connectionStatus}
                lastUpdate={lastUpdate}
                proximityState={proximityState}
              />
            </div>

            {/* Session share link */}
            {sessionId && !demoMode && (
              <div className="mt-4 bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-2">
                  Share & PDF Export
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-gray-400 truncate"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="px-3 py-2 bg-emerald-400/10 border border-emerald-400/20 rounded-lg font-mono text-xs text-emerald-400 hover:bg-emerald-400/20 transition-colors whitespace-nowrap"
                  >
                    COPY
                  </button>
                </div>
                <a
                  href={`/pdf-template.html?session=${sessionId}&origin=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg font-mono text-xs text-cyan-400 tracking-wider transition-colors"
                >
                  <span>📄</span> OPEN PRINTABLE PDF MEMO →
                </a>
              </div>
            )}

            {/* Compass status */}
            <div className="mt-4 bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
              <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-2">
                Sensors
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">GPS</span>
                  <span className={trackerPosition ? 'text-emerald-400' : 'text-red-400'}>
                    {trackerPosition ? 'ACTIVE' : geoError ? 'ERROR' : 'WAITING'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">COMPASS</span>
                  <span className={compassSupported ? 'text-emerald-400' : 'text-amber-400'}>
                    {compassSupported ? `${Math.round(compassHeading || 0)}°` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">MODE</span>
                  <span className="text-gray-400">
                    {compassSupported ? 'RELATIVE' : 'MAP'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center — Radar & Arrow */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center gap-6">
            {/* Status message */}
            <StatusMessages
              proximityLevel={proximityState?.level || 'FAR'}
              movementStatus={movementStatus}
              interval={4000}
              className="h-6"
            />

            {/* Radar */}
            <RadarHUD
              bearing={bearing}
              distance={distance || 0}
              maxRange={500}
              proximityState={proximityState}
              signalStrength={signalStrength}
              isActive={isActive}
              hasCompass={compassSupported}
              deviceHeading={compassHeading || 0}
            />

            {/* Directional arrow */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <DirectionalArrow
                  bearing={relativeBearing}
                  hasCompass={compassSupported}
                  proximityState={proximityState}
                />
                {direction && (
                  <div className="text-center mt-2">
                    <div
                      className="text-3xl font-mono font-bold"
                      style={{ color: proximityState?.color || '#00ffcc' }}
                    >
                      {direction.arrow} {direction.label}
                    </div>
                    <div className="text-2xl font-mono font-bold text-white mt-1">
                      {distance !== null ? bucketDistance(distance) : '---'}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Waiting for target */}
            {!isActive && sessionActive && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">📡</div>
                <div className="text-emerald-400/50 font-mono text-sm tracking-widest">
                  {facultyJoined ? 'AWAITING LOCATION DATA...' : 'WAITING FOR TARGET TO CONNECT...'}
                </div>
                {shareUrl && (
                  <div className="mt-3 text-xs font-mono text-gray-600">
                    Share this session code with the faculty member:
                    <div className="text-lg text-cyan-400 font-bold tracking-[0.3em] mt-1">
                      {sessionId}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Not connected */}
            {!sessionActive && !demoMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">🔇</div>
                <div className="text-gray-500 font-mono text-sm tracking-widest mb-4">
                  NO ACTIVE SESSION
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg font-mono text-emerald-400 text-xs tracking-wider hover:bg-emerald-400/20 transition-colors"
                  >
                    CREATE SESSION
                  </button>
                  <button
                    onClick={startDemo}
                    className="px-4 py-2 bg-amber-400/10 border border-amber-400/30 rounded-lg font-mono text-amber-400 text-xs tracking-wider hover:bg-amber-400/20 transition-colors"
                  >
                    DEMO MODE
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right panel — Additional info (desktop) */}
          <div className="lg:col-span-3 order-3 space-y-4">
            {/* Session info */}
            {(sessionActive || demoMode) && (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-3">
                  Session Info
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">SESSION</span>
                    <span className="text-emerald-400">{demoMode ? 'DEMO' : sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TARGET</span>
                    <span className="text-white">{targetName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">FACULTY</span>
                    <span className={facultyJoined ? 'text-emerald-400' : 'text-gray-600'}>
                      {facultyJoined ? 'CONNECTED' : 'WAITING'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MODE</span>
                    <span className={demoMode ? 'text-amber-400' : 'text-cyan-400'}>
                      {demoMode ? 'SIMULATION' : 'LIVE'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Distance gauge */}
            {isActive && distance !== null && (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-3">
                  Distance Gauge
                </div>
                <div className="space-y-2">
                  {[
                    { label: '500m', threshold: 500 },
                    { label: '250m', threshold: 250 },
                    { label: '100m', threshold: 100 },
                    { label: '50m', threshold: 50 },
                    { label: '20m', threshold: 20 },
                    { label: '10m', threshold: 10 },
                  ].map(({ label, threshold }) => {
                    const active = distance <= threshold;
                    const state = getProximityState(threshold);
                    return (
                      <div key={threshold} className="flex items-center gap-2">
                        <div className="w-10 text-right text-[10px] font-mono text-gray-600">
                          {label}
                        </div>
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: active ? '100%' : '0%',
                              backgroundColor: active ? state.color : '#333',
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full transition-colors ${
                            active ? '' : 'bg-gray-800'
                          }`}
                          style={{ backgroundColor: active ? state.color : undefined }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error messages */}
            {geoError && !demoMode && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="text-[10px] font-mono text-red-400 tracking-widest uppercase mb-2">
                  Tracker GPS Error
                </div>
                <div className="text-xs font-mono text-red-400/70">
                  {geoError.code === 1
                    ? 'Location denied — enable GPS for accurate tracking'
                    : geoError.code === 2
                    ? 'Position unavailable — try moving outdoors'
                    : 'GPS timeout — retrying...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
