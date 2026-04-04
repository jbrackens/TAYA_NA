/**
 * GeoComply geolocation verification service
 * In production, this integrates with GeoComply SDK
 * For now, creates the service interface that components will use
 */

export interface GeoComplianceResult {
  allowed: boolean;
  state?: string;
  country?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface GeoComplianceService {
  checkLocation(): Promise<GeoComplianceResult>;
  isSupported(): boolean;
}

/**
 * Implementation that checks the backend for location verification
 */
class GeoComplianceServiceImpl implements GeoComplianceService {
  private apiBase: string;

  constructor() {
    this.apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';
  }

  async checkLocation(): Promise<GeoComplianceResult> {
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('phoenix_access_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${this.apiBase}/api/v1/compliance/geolocation`, { headers });
      if (!res.ok) {
        return {
          allowed: false,
          errorCode: 'API_ERROR',
          errorMessage: 'Geolocation check failed',
        };
      }
      return await res.json();
    } catch {
      return {
        allowed: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Unable to verify location',
      };
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }
}

export const geoComplianceService = new GeoComplianceServiceImpl();
