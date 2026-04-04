import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";

interface Props {
  secondsRemaining: number;
  onCloseDialog: () => void;
}

const CountdownTimer: FC<Props> = props => {
  const [secondsRemaining, setSecondsRemaining] = useState(props.secondsRemaining);
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const secondsToTime = useCallback((secs: number) => {
    const hours = Math.floor(secs / (60 * 60));
    const divisorForMinutes = secs % (60 * 60);
    const minutes = Math.floor(divisorForMinutes / 60);
    const divisorForSeconds = divisorForMinutes % 60;
    const seconds = Math.ceil(divisorForSeconds);

    return {
      h: hours,
      m: minutes,
      s: seconds
    };
  }, []);

  const tick = useCallback(() => {
    const seconds = secondsRemaining - 1;
    const time = secondsToTime(seconds);

    setSecondsRemaining(seconds);
    setTime(time);

    if (secondsRemaining <= 0 && interval.current !== null) {
      clearInterval(interval.current);
      props.onCloseDialog();
    }
  }, [props, secondsRemaining, secondsToTime]);

  const checkSecond = useCallback((secs: number) => {
    if (secs < 10 && secs >= 0) {
      let newSecs = "";
      newSecs = "0" + secs;
      return newSecs;
    }

    return secs;
  }, []);

  useEffect(() => {
    interval.current = setInterval(tick, 1000);

    return () => {
      if (interval.current !== null) {
        clearInterval(interval.current);
      }
    };
  }, [tick]);

  return (
    <Box>
      <Box component="p">
        The code is active for{" "}
        {(time.m || time.m === 0) && (time.s || time.s === 0) ? (
          <Box component="span">
            {time.m}:{checkSecond(time.s)}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export { CountdownTimer };
