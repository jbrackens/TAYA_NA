import React, { useCallback, useEffect, useRef, useState } from "react";
import Box from "@material-ui/core/Box";

interface Props {
  secondsRemaining: number;
  onCloseDialog: () => void;
}

const CountdownTimer = (props: Props) => {
  const [secondsRemaining, setSecondsRemaining] = useState(props.secondsRemaining);
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const secondsToTime = useCallback((secs: number) => {
    let hours = Math.floor(secs / (60 * 60));
    let divisorForMinutes = secs % (60 * 60);
    let minutes = Math.floor(divisorForMinutes / 60);
    let divisorForSeconds = divisorForMinutes % 60;
    let seconds = Math.ceil(divisorForSeconds);

    return {
      h: hours,
      m: minutes,
      s: seconds,
    };
  }, []);

  const tick = useCallback(() => {
    let seconds = secondsRemaining - 1;
    let time = secondsToTime(seconds);

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

export default CountdownTimer;
