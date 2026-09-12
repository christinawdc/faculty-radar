import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for browser Geolocation API
 */
export function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);
  const retryTimer = useRef(null);

  const handleSuccess = useCallback((pos) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    });
    setError(null);
    setWatching(true);
  }, []);

  const handleError = useCallback((err) => {
    setError(err);
    // If high-accuracy timed out, retry with standard accuracy (Wi-Fi/Cellular)
    if (err.code === 3 || err.code === 2) {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (fallbackErr) => setError(fallbackErr),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, [handleSuccess]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation not supported by this browser' });
      return;
    }

    setWatching(true);

    // 1. Instant quick position lock (low accuracy is fast & reliable indoors)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );

    // 2. Continuous high accuracy watch
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
        ...options,
      }
    );
  }, [handleSuccess, handleError, options]);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (retryTimer.current) {
      clearInterval(retryTimer.current);
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
      }
    };
  }, []);

  return { position, error, watching, startWatching, stopWatching };
}

/**
 * Custom hook for Device Orientation (compass heading)
 */
export function useDeviceOrientation() {
  const [heading, setHeading] = useState(null);
  const [supported, setSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires permission request
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result === 'granted') {
          setPermissionGranted(true);
          return true;
        }
      } catch (e) {
        console.error('Device orientation permission error:', e);
      }
      return false;
    }
    // Non-iOS — permission not needed
    setPermissionGranted(true);
    return true;
  }, []);

  useEffect(() => {
    const handleOrientation = (event) => {
      // webkitCompassHeading is iOS-specific, more reliable
      if (event.webkitCompassHeading !== undefined) {
        setHeading(event.webkitCompassHeading);
        setSupported(true);
      } else if (event.alpha !== null) {
        // Android/desktop: alpha is rotation around z-axis
        // Convert to compass heading (0 = North)
        setHeading((360 - event.alpha) % 360);
        setSupported(true);
      }
    };

    if (permissionGranted || typeof DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [permissionGranted]);

  return { heading, supported, requestPermission, permissionGranted };
}

/**
 * Custom hook for API communication
 */
export function useApi() {
  const rawApi = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const baseUrl = rawApi;

  const getWsBaseUrl = () => {
    let rawWs = (import.meta.env.VITE_WS_URL || '').trim().replace(/\/+$/, '');

    // Clean up accidental formatting like "wss:// https://..." or "wss://https://"
    rawWs = rawWs.replace(/^wss?:\/\/\s*https?:\/\//i, 'wss://');
    rawWs = rawWs.replace(/^wss?:\/\/\s+/i, 'wss://');
    rawWs = rawWs.replace(/^https?:\/\/\s+/i, 'wss://');

    if (rawWs) {
      if (rawWs.startsWith('http://')) return rawWs.replace('http://', 'ws://');
      if (rawWs.startsWith('https://')) return rawWs.replace('https://', 'wss://');
      if (!rawWs.startsWith('ws://') && !rawWs.startsWith('wss://')) {
        return `wss://${rawWs}`;
      }
      return rawWs;
    }

    // Auto-derive from baseUrl if configured
    if (baseUrl) {
      if (baseUrl.startsWith('https://')) return baseUrl.replace('https://', 'wss://');
      if (baseUrl.startsWith('http://')) return baseUrl.replace('http://', 'ws://');
      return `wss://${baseUrl}`;
    }

    // Fallback to current browser window host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  };

  const createSession = async (targetName = 'SARJU SIR', timeoutMinutes = 30) => {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_name: targetName, timeout_minutes: timeoutMinutes }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  };

  const getSession = async (sessionId) => {
    const res = await fetch(`${baseUrl}/api/session/${sessionId}`);
    if (!res.ok) throw new Error('Session not found');
    return res.json();
  };

  const joinSession = async (sessionId) => {
    const res = await fetch(`${baseUrl}/api/session/${sessionId}/join`, {
      method: 'POST',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Failed to join session');
    }
    return res.json();
  };

  const sendLocation = async (sessionId, location) => {
    const res = await fetch(`${baseUrl}/api/session/${sessionId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    });
    if (!res.ok) throw new Error('Failed to send location');
    return res.json();
  };

  const terminateSession = async (sessionId) => {
    const res = await fetch(`${baseUrl}/api/session/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to terminate session');
    return res.json();
  };

  const stopSharing = async (sessionId) => {
    const res = await fetch(`${baseUrl}/api/session/${sessionId}/stop-sharing`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to stop sharing');
    return res.json();
  };

  const connectWebSocket = (sessionId, onMessage) => {
    const wsUrl = getWsBaseUrl();
    const ws = new WebSocket(`${wsUrl}/ws/tracker/${sessionId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      onMessage({ type: 'disconnected', message: 'CONNECTION LOST' });
    };

    ws.onerror = () => {
      onMessage({ type: 'error', message: 'WEBSOCKET ERROR' });
    };

    // Heartbeat ping every 15 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 15000);

    return {
      ws,
      close: () => {
        clearInterval(pingInterval);
        ws.close();
      },
    };
  };

  return {
    createSession,
    getSession,
    joinSession,
    sendLocation,
    terminateSession,
    stopSharing,
    connectWebSocket,
  };
}
