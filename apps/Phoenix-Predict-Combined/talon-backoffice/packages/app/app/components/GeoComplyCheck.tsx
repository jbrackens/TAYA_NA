"use client";

import React, { useEffect, useState } from "react";
import {
  geoComplianceService,
  GeoComplianceResult,
} from "../lib/services/geocomply";
import { useAuth } from "../hooks/useAuth";

interface GeoComplyCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function GeoComplyCheck({
  children,
  fallback,
}: GeoComplyCheckProps) {
  const [result, setResult] = useState<GeoComplianceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkCompliance = async () => {
      setLoading(true);
      try {
        const complianceResult = await geoComplianceService.checkLocation(
          user?.id,
        );
        setResult(complianceResult);
      } catch (err) {
        setResult({
          allowed: false,
          errorCode: "UNKNOWN_ERROR",
          errorMessage: "Unable to verify geolocation",
        });
      } finally {
        setLoading(false);
      }
    };

    checkCompliance();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="rounded border border-[#1a1f3a] bg-[#0a0e18] p-4 text-center text-[13px] text-[#64748b]">
        Verifying your location...
      </div>
    );
  }

  if (!result?.allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="rounded border border-[var(--no)] bg-[rgba(244,63,94,0.1)] p-4 text-[13px] text-[var(--no)]">
        {result?.errorMessage ||
          "Your location is not allowed to access this content."}
      </div>
    );
  }

  return <div className="flex flex-col gap-3">{children}</div>;
}
