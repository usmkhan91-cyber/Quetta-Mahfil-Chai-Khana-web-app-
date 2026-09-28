
/**
 * Quetta Mahfil Spatial Intelligence v1.5.0
 * Handles geolocation, distance calculation, and heritage delivery zones
 */

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Bahria Town Lahore Quetta Mahfil Location (Example)
export const MAHFIL_LOCATION = {
  lat: 31.3621,
  lng: 74.1873
};

const MAX_DELIVERY_DISTANCE_KM = 15;

class SpatialService {
  /**
   * Fetch user's current coordinates
   */
  async getCurrentLocation(): Promise<LocationState> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Spatial systems sensors unavailable."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /**
   * Calculate Harvesine distance between two points in KM
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of earth in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check if location is within delivery radius
   */
  isWithinDeliveryZone(lat: number, lng: number): { inZone: boolean, distance: number } {
    const distance = this.calculateDistance(lat, lng, MAHFIL_LOCATION.lat, MAHFIL_LOCATION.lng);
    return {
      inZone: distance <= MAX_DELIVERY_DISTANCE_KM,
      distance: Math.round(distance * 10) / 10
    };
  }
}

export const spatialCore = new SpatialService();
