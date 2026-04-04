import { useMemo, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { changeLoginOpen } from "@brandserver-client/lobby";
import { BETBY_FRAME_ID } from "../constants";

interface BetbyEvent {
  type:
    | "onBetbyLogin"
    | "onBetbyRegister"
    | "onBetbyRecharge"
    | "onBetbySessionRefresh";
  action: () => void;
}

function initializeEvents(element: HTMLIFrameElement, events: BetbyEvent[]) {
  events.map(({ type, action }) => {
    element?.contentDocument?.addEventListener(type, action);
  });
}

function clearEvents(element: HTMLIFrameElement, events: BetbyEvent[]) {
  events.map(({ type, action }) => {
    element?.contentDocument?.removeEventListener(type, action);
  });
}

function useBetbyEvents() {
  const { push } = useRouter();
  const dispatch = useDispatch();
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const events: BetbyEvent[] = useMemo(
    () => [
      {
        type: "onBetbyLogin",
        action: () => dispatch(changeLoginOpen(true))
      },
      {
        type: "onBetbyRegister",
        action: () => {
          const button = document.getElementById("registration-cta");
          button && button.click();
        }
      },
      {
        type: "onBetbyRecharge",
        action: () => push("/loggedin/myaccount/deposit")
      },
      {
        type: "onBetbySessionRefresh",
        action: () => window.location.reload()
      }
    ],
    [push, dispatch]
  );

  useEffect(() => {
    const frame = document.getElementById(BETBY_FRAME_ID) as HTMLIFrameElement;

    if (frame != null && !eventsLoaded) {
      frame.onload = function () {
        setEventsLoaded(true);
        initializeEvents(frame, events);
      };
    }

    return () => {
      if (eventsLoaded) {
        clearEvents(frame, events);
      }
    };
  }, [events]);
}

export { useBetbyEvents };
