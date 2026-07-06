import React from "react";
import { useTranslation } from "i18n";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { useState } from "react";
import { ContentContainer } from "../session-timer/index.styles";
import { useRef } from "react";
import { useLogout } from "../../../hooks/useLogout";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { refresh as goRefresh } from "../../../services/go-api";
import { getRefreshToken, saveTokens } from "../../../services/go-api/client";

const WARN_TIME = 60000;
const SIGN_OUT_TIME = 900000 - WARN_TIME;

const IdleActivityComponent: React.FC = () => {
  const { t } = useTranslation(["idle-activity"]);
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [counter, setCounter] = useState(WARN_TIME / 1000);
  const modalVisibilityRef = useRef(isModalVisible);
  const { logOutAndRemoveToken } = useLogout();
  const [isLoggedOutModalVisibile, setIsLoggedOutModalVisible] = useState(
    false,
  );

  let logoutTimeout: null | ReturnType<typeof setTimeout> = null;
  let counterTimeout: null | ReturnType<typeof setInterval> = null;
  let refreshTimeout: null | ReturnType<typeof setTimeout> = null;

  // Rewired: use Go backend refresh instead of old useApi triggerRefresh
  const triggerGoRefresh = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;
      const response = await goRefresh(refreshToken);
      saveTokens(
        response.access_token,
        response.refresh_token,
        response.expires_in,
        undefined,
        response.refresh_expires_in,
      );
    } catch {
      // Refresh failed — will be caught by interceptor on next request
    }
  };

  const keepLoggedIn = () => {
    triggerGoRefresh();
    setIsModalVisible(false);
    modalVisibilityRef.current = false;
    clearTimeouts();
  };

  const triggerLogout = (showModal = false) => {
    setIsModalVisible(false);
    modalVisibilityRef.current = false;
    logOutAndRemoveToken();
    showModal && setIsLoggedOutModalVisible(true);
  };

  const warn = () => {
    let counter = WARN_TIME / 1000;
    counterTimeout = setInterval(() => {
      counter--;
      if (counter === 1) {
        triggerLogout(true);
      }
      setCounter(counter);
    }, 1000);
    setIsModalVisible(true);
    modalVisibilityRef.current = true;
  };

  const setTimeouts = () => {
    if (!modalVisibilityRef.current) {
      logoutTimeout = setTimeout(warn, SIGN_OUT_TIME);
    }
  };

  const clearTimeouts = () => {
    if (logoutTimeout && !modalVisibilityRef.current)
      clearTimeout(logoutTimeout);
    if (counterTimeout && !modalVisibilityRef.current)
      clearInterval(counterTimeout);
  };

  useEffect(() => {
    if (isUserLoggedIn) {
      const events = [
        "load",
        "mousemove",
        "mousedown",
        "click",
        "scroll",
        "keypress",
      ];

      const resetTimeout = () => {
        clearTimeouts();
        setTimeouts();
      };

      events.forEach((_event, idx) => {
        window.addEventListener(events[idx], resetTimeout);
      });

      setTimeouts();
      return () => {
        events.forEach((_event, idx) => {
          window.removeEventListener(events[idx], resetTimeout);
          clearTimeouts();
        });
      };
    } else {
      refreshTimeout && clearTimeout(refreshTimeout);
    }
  }, [isUserLoggedIn]);

  // Rewired: auto-refresh token 30s before expiry using Go backend
  useEffect(() => {
    if (typeof window === "undefined") return;
    const expRaw = localStorage.getItem("JdaTokenExpDate");
    if (!expRaw) return;

    const expDate = JSON.parse(expRaw);
    if (typeof expDate !== "number" || expDate === 0) return;

    const difference = expDate - Date.now() - 30000;
    if (difference <= 0) {
      triggerGoRefresh();
      return;
    }

    refreshTimeout = setTimeout(() => {
      triggerGoRefresh();
    }, difference);

    return () => {
      refreshTimeout && clearTimeout(refreshTimeout);
    };
  }, [isUserLoggedIn]);

  return (
    <>
      <ResultModalComponent
        status={StatusEnum.INFO}
        title={t("ACCOUNT_INACTIVITY")}
        subTitle={
          <ContentContainer data-testid="modalContent">
            {t("YOU_WILL_BE_LOGGED_OUT", { time: counter })}
          </ContentContainer>
        }
        okText={t("KEEP_ME_LOGGED_IN")}
        onOk={keepLoggedIn}
        cancelText={t("LOGOUT")}
        onCancel={triggerLogout}
        isVisible={isModalVisible}
      />
      <ResultModalComponent
        status={StatusEnum.INFO}
        title={t("ACCOUNT_INACTIVITY")}
        subTitle={t("LOGGED_OUT_DUE_TO_INACTIVITY")}
        onOk={() => setIsLoggedOutModalVisible(false)}
        okText={t("OK")}
        isVisible={isLoggedOutModalVisibile}
      />
    </>
  );
};

export { IdleActivityComponent };
