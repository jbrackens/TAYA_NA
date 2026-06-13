"use client";

import React, { useState, useEffect } from "react";

interface SessionTimerProps {
  sessionStartTime?: Date;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  sessionStartTime,
}) => {
  const [elapsed, setElapsed] = useState("0h 0m");

  useEffect(() => {
    if (!sessionStartTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = now.getTime() - sessionStartTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setElapsed(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  if (!sessionStartTime) return null;

  return (
    <div className="flex items-center gap-[6px] whitespace-nowrap rounded-md bg-[#1a2040] px-2.5 py-1 text-[11px] font-semibold text-[#64748b]">
      <span className="text-[#4a5580]">SESSION:</span>
      <span>{elapsed}</span>
    </div>
  );
};

export default SessionTimer;
