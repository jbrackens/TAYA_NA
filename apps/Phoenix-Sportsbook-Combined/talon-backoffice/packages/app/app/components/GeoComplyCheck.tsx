'use client';

import React, { useEffect, useState } from 'react';
import { geoComplianceService, GeoComplianceResult } from '../lib/services/geocomply';

interface GeoComplyCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function GeoComplyCheck({ children, fallback }: GeoComplyCheckProps) {
  const [result, setResult] = useState<GeoComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCompliance = async () => {
      setLoading(true);
      try {
        const complianceResult = await geoComplianceService.checkLocation();
        setResult(complianceResult);
      } catch (err) {
        setResult({
          allowed: false,
          errorCode: 'UNKNOWN_ERROR',
          errorMessage: 'Unable to verify geolocation',
        });
      } finally {
        setLoading(false);
      }
    };

    checkCompliance();
  }, []);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const loadingStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#0a0e18',
    border: '1px solid #1a1f3a',
    borderRadius: '4px',
    color: '#64748b',
    fontSize: '13px',
    textAlign: 'center',
  };

  const errorStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid #f87171',
    borderRadius: '4px',
    color: '#f87171',
    fontSize: '13px',
  };

  if (loading) {
    return <div style={loadingStyle}>Verifying your location...</div>;
  }

  if (!result?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={errorStyle}>
        {result?.errorMessage || 'Your location is not allowed to access this content.'}
      </div>
    );
  }

  return <div style={containerStyle}>{children}</div>;
}
