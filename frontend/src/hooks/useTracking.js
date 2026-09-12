import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for browser Geolocation API
 */
export function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
    ...options,
  };

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation not supported by this browser' });
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
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
      },
      (err) => {
        setError(err);
        setWatching(false);
      },
      defaultOptions
    );

    setWatching(true);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
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
  const baseUrl = import.meta.env.VITE_API_URL || '';

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
    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}`;
    }
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
