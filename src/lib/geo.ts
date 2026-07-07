/**
 * School coordinates used by both client and server location checks.
 * Keep this file dependency-free so both edges can import it.
 */
export const SCHOOL_LAT = 25.0833;
export const SCHOOL_LNG = 121.5886;
export const SCHOOL_RADIUS_M = 500;

export function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinSchool(lat: number, lng: number): boolean {
  return getDistanceM(lat, lng, SCHOOL_LAT, SCHOOL_LNG) <= SCHOOL_RADIUS_M;
}
