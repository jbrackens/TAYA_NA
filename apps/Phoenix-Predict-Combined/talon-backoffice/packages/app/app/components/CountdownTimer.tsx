"use client";

import { useEffect, useState, useRef } from "react";

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
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
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

    const timerInterval: number | null = window.setInterval(
      calculateTime,
      1000,
    );

    return () => {
      if (timerInterval !== null) {
        clearInterval(timerInterval);
      }
    };
  }, [targetDate]);

  const labelClass =
    "text-xs font-semibold uppercase tracking-normal text-slate-500";
  const unitClass = "flex flex-col items-center gap-1";
  const numberClass = "min-w-10 text-center text-2xl font-bold text-slate-200";
  const unitLabelClass = "text-[11px] uppercase tracking-normal text-slate-500";
  const separatorClass = "mb-3 text-xl text-slate-500";

  if (time.expired) {
    return (
      <div className="flex flex-col gap-2">
        {label && <div className={labelClass}>{label}</div>}
        <div className="text-center text-sm font-semibold text-red-500">
          Expired
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <div className={labelClass}>{label}</div>}
      <div className="flex items-center justify-center gap-3">
        {time.days > 0 && (
          <>
            <div className={unitClass}>
              <div className={numberClass}>
                {String(time.days).padStart(2, "0")}
              </div>
              <div className={unitLabelClass}>
                Day{time.days !== 1 ? "s" : ""}
              </div>
            </div>
            <div className={separatorClass}>:</div>
          </>
        )}
        <div className={unitClass}>
          <div className={numberClass}>
            {String(time.hours).padStart(2, "0")}
          </div>
          <div className={unitLabelClass}>
            Hour{time.hours !== 1 ? "s" : ""}
          </div>
        </div>
        <div className={separatorClass}>:</div>
        <div className={unitClass}>
          <div className={numberClass}>
            {String(time.minutes).padStart(2, "0")}
          </div>
          <div className={unitLabelClass}>Min</div>
        </div>
        <div className={separatorClass}>:</div>
        <div className={unitClass}>
          <div className={numberClass}>
            {String(time.seconds).padStart(2, "0")}
          </div>
          <div className={unitLabelClass}>Sec</div>
        </div>
      </div>
    </div>
  );
}
