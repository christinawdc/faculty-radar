/**
 * Geospatial utility functions for Faculty Signal
 * Uses Haversine formula for distance and bearing calculations
 */

const EARTH_RADIUS_M = 6371000; // Earth's radius in meters

/**
 * Convert degrees to radians
 */
export function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @returns distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Calculate initial bearing from point 1 to point 2
 * @returns bearing in degrees (0-360, where 0 = North)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Get cardinal/intercardinal direction from bearing
 */
export function getCardinalDirection(bearing) {
  const directions = [
    { label: 'N', arrow: '↑', min: 337.5, max: 360 },
    { label: 'N', arrow: '↑', min: 0, max: 22.5 },
    { label: 'NE', arrow: '↗', min: 22.5, max: 67.5 },
    { label: 'E', arrow: '→', min: 67.5, max: 112.5 },
    { label: 'SE', arrow: '↘', min: 112.5, max: 157.5 },
    { label: 'S', arrow: '↓', min: 157.5, max: 202.5 },
    { label: 'SW', arrow: '↙', min: 202.5, max: 247.5 },
    { label: 'W', arrow: '←', min: 247.5, max: 292.5 },
    { label: 'NW', arrow: '↖', min: 292.5, max: 337.5 },
  ];

  for (const dir of directions) {
    if (bearing >= dir.min && bearing < dir.max) {
      return dir;
    }
  }
  return directions[0];
}

/**
 * Bucket distance into approximate display values
 */
export function bucketDistance(meters) {
  if (meters < 10) return '< 10 m';
  if (meters < 25) return '~' + Math.round(meters / 5) * 5 + ' m';
  if (meters < 100) return '~' + Math.round(meters / 10) * 10 + ' m';
  if (meters < 500) return '~' + Math.round(meters / 25) * 25 + ' m';
  if (meters < 1000) return '~' + Math.round(meters / 50) * 50 + ' m';
  if (meters < 5000) return '~' + (meters / 1000).toFixed(1) + ' km';
  return '~' + Math.round(meters / 1000) + ' km';
}

/**
 * Get proximity state based on distance
 */
export function getProximityState(meters) {
  if (meters <= 10)
    return { level: 'ACQUIRED', label: 'TARGET ACQUIRED', color: '#ff0040', pulseSpeed: 0.3, intensity: 1.0 };
  if (meters <= 20)
    return { level: 'VERY_CLOSE', label: 'FACULTY VERY CLOSE', color: '#ff0040', pulseSpeed: 0.5, intensity: 0.9 };
  if (meters <= 50)
    return { level: 'PROXIMITY', label: 'PROXIMITY ALERT', color: '#ff6600', pulseSpeed: 0.7, intensity: 0.75 };
  if (meters <= 100)
    return { level: 'APPROACHING', label: 'APPROACHING', color: '#ffcc00', pulseSpeed: 1.0, intensity: 0.6 };
  if (meters <= 250)
    return { level: 'DETECTED', label: 'SIGNAL DETECTED', color: '#00ccff', pulseSpeed: 1.5, intensity: 0.4 };
  if (meters <= 500)
    return { level: 'SEARCHING', label: 'SEARCHING', color: '#0088ff', pulseSpeed: 2.0, intensity: 0.25 };
  return { level: 'FAR', label: 'SCANNING...', color: '#4466aa', pulseSpeed: 3.0, intensity: 0.15 };
}

/**
 * Calculate relative bearing accounting for device compass heading
 */
export function getRelativeBearing(absoluteBearing, deviceHeading) {
  if (deviceHeading === null || deviceHeading === undefined) {
    return absoluteBearing;
  }
  return (absoluteBearing - deviceHeading + 360) % 360;
}
