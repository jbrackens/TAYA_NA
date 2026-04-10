/**
 * GeoComply geolocation verification service
 * In production, this integrates with GeoComply SDK
 * For now, creates the service interface that components will use
 */

import { apiClient } from "../api/client";

export interface GeoComplianceResult {
  allowed: boolean;
  status?: string;
  country?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface GeoComplianceService {
  checkLocation(userId?: string): Promise<GeoComplianceResult>;
  isSupported(): boolean;
}

/**
 * Implementation that checks the backend for location verification
 */
class GeoComplianceServiceImpl implements GeoComplianceService {
  private bypassChecks: boolean;

  constructor() {
    this.bypassChecks =
      process.env.NEXT_PUBLIC_DISABLE_GEOLOCATION_CHECK === 'true';
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  }

  async checkLocation(userId?: string): Promise<GeoComplianceResult> {
    if (this.bypassChecks) {
      return {
        allowed: true,
        status: 'bypassed',
        country: 'US',
      };
    }

    if (!userId) {
      return {
        allowed: false,
        errorCode: "MISSING_USER",
        errorMessage: "Log in to verify your location.",
      };
    }

    try {
      const position = await this.getCurrentPosition();
      const response = await apiClient.post<{
        result: {
          status: string;
          message: string;
          country?: string;
        };
      }>("/api/v1/compliance/geo/verify", {
        userId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      return {
        allowed: response.result.status === "approved",
        status: response.result.status,
        country: response.result.country,
        errorMessage:
          response.result.status === "approved"
            ? undefined
            : response.result.message || "Betting is not available in your current location.",
      };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const geoError = error as { code: number };

        if (geoError.code === 1) {
          return {
            allowed: false,
            errorCode: "GEO_PERMISSION_DENIED",
            errorMessage: "Location access was denied. Enable location services to place a bet.",
          };
        }
        if (geoError.code === 2) {
          return {
            allowed: false,
            errorCode: "GEO_POSITION_UNAVAILABLE",
            errorMessage: "Your location could not be determined. Try again in a moment.",
          };
        }
        if (geoError.code === 3) {
          return {
            allowed: false,
            errorCode: "GEO_TIMEOUT",
            errorMessage: "Location verification timed out. Try again.",
          };
        }
      }

      return {
        allowed: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: "Unable to verify location",
      };
    }
  }

  isSupported(): boolean {
    if (this.bypassChecks) {
      return true;
    }
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }
}

export const geoComplianceService = new GeoComplianceServiceImpl();
