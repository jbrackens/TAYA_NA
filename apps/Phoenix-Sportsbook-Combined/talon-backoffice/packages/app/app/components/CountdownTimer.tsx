'use client';

import React, { useEffect, useState, useRef } from 'react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onExpire?: () => void;
  label?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export default function CountdownTimer({
  targetDate,
  onExpire,
  label,
}: CountdownTimerProps) {
  const [time, setTime] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTime({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        onExpireRef.current?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({
        days,
        hours,
        minutes,
        seconds,
        expired: false,
      });
    };

    calculateTime();

    const timerInterval: number | null = window.setInterval(calculateTime, 1000);

    return () => {
      if (timerInterval !== null) {
        clearInterval(timerInterval);
      }
    };
  }, [targetDate]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const timerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const unitStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  };

  const numberStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e2e8f0',
    minWidth: '40px',
    textAlign: 'center',
  };

  const labelSmallStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const separatorStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#64748b',
    marginBottom: '12px',
  };

  const expiredStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  };

  if (time.expired) {
    return (
      <div style={containerStyle}>
        {label && <div style={labelStyle}>{label}</div>}
        <div style={expiredStyle}>Expired</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {label && <div style={labelStyle}>{label}</div>}
      <div style={timerStyle}>
        {time.days > 0 && (
          <>
            <div style={unitStyle}>
              <div style={numberStyle}>{String(time.days).padStart(2, '0')}</div>
              <div style={labelSmallStyle}>Day{time.days !== 1 ? 's' : ''}</div>
            </div>
            <div style={separatorStyle}>:</div>
          </>
        )}
        <div style={unitStyle}>
          <div style={numberStyle}>{String(time.hours).padStart(2, '0')}</div>
          <div style={labelSmallStyle}>Hour{time.hours !== 1 ? 's' : ''}</div>
        </div>
        <div style={separatorStyle}>:</div>
        <div style={unitStyle}>
          <div style={numberStyle}>{String(time.minutes).padStart(2, '0')}</div>
          <div style={labelSmallStyle}>Min</div>
        </div>
        <div style={separatorStyle}>:</div>
        <div style={unitStyle}>
          <div style={numberStyle}>{String(time.seconds).padStart(2, '0')}</div>
          <div style={labelSmallStyle}>Sec</div>
        </div>
      </div>
    </div>
  );
}
