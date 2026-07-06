import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "i18n";
import { useCurrentSession } from "../../../services/go-api/compliance/compliance-hooks";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";

const SessionTimerComponent: React.FC = () => {
  const { t } = useTranslation(["session-timer"]);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { data: session } = useCurrentSession(isLoggedIn);

  const sessionDisplay = useMemo(() => {
    if (!session?.sessionStartTime) return null;
    const start = new Date(session.sessionStartTime).getTime();
    const now = new Date(session.currentTime || Date.now()).getTime();
    const diffMs = Math.max(0, now - start);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${t("SESSION")}: ${hours}h ${minutes}m`;
  }, [session, t]);

  if (!sessionDisplay) return null;

  return (
    <span style={{ fontSize: 12, opacity: 0.8 }}>
      {sessionDisplay}
    </span>
  );
};

export { SessionTimerComponent };
