import React, { ReactNode, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { isEqual, isNil } from "lodash";
import { useSpy, useToken, Method, PunterRoles } from "@phoenix-ui/utils";
import {
  validateSession,
  buildRedirectUrl,
  clientNukeAuth,
} from "../../../utils/auth";
import Spinner from "../../layout/spinner";
import { useTranslation } from "i18n";
import { Modal, Button } from "antd";
import { useApi } from "../../../services/api/api-service";
import { useSelector, useDispatch } from "react-redux";
import {
  selectShouldLogoutUser,
  shouldNotLogoutUser,
} from "../../../lib/slices/authSlice";
import dayjs from "dayjs";

export type TokenRequiredProps = {
  children: ReactNode;
  roles?: PunterRoles | undefined;
};

const SIGN_OUT_TIME = 840000;

const SessionGuard = ({ children }: TokenRequiredProps): any => {
  const { t } = useTranslation(["common", "session-guard"]);
  const [isVerificationInProgress, setVerificationInProgress] = useState(false);
  const { spy } = useSpy();
  const router = useRouter();
  const isAuthRoute = router.pathname.includes("auth");
  const { getRefreshToken, getRefreshTokenExpDate } = useToken();
  const refrehToken =
    typeof localStorage !== "undefined" ? getRefreshToken() : "";
  const refrehTokenExpDate =
    typeof localStorage !== "undefined" ? getRefreshTokenExpDate() : "";

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [counter, setCounter] = useState(60);
  const modalVisibilityRef = useRef(isModalVisible);
  const [, , , triggerRefresh] = useApi("", Method.POST);
  const currentPath = router.asPath;
  const shouldLogoutUser = useSelector(selectShouldLogoutUser);
  const dispatch = useDispatch();

  let logoutTimeout: null | ReturnType<typeof setTimeout> = null;
  let counterTimeout: null | ReturnType<typeof setTimeout> = null;
  let refreshTimeout: null | ReturnType<typeof setTimeout> = null;

  useEffect(() => {
    if (shouldLogoutUser) {
      dispatch(shouldNotLogoutUser());
      clientNukeAuth();
    }
  }, [shouldLogoutUser]);

  spy(router.pathname, ({ values, prevValues }) => {
    if (!isEqual(values, prevValues)) {
      const triggerCheck = async () => {
        const validationOutput = await validateSession();
        if (isNil(validationOutput)) {
          router.push(buildRedirectUrl(currentPath));
        } else {
          setVerificationInProgress(false);
        }
      };
      if (!isAuthRoute) {
        setVerificationInProgress(true);
        triggerCheck();
      }
    }
  });

  const clearTimeouts = () => {
    if (logoutTimeout && !modalVisibilityRef.current)
      clearTimeout(logoutTimeout);
    if (counterTimeout && !modalVisibilityRef.current)
      clearInterval(counterTimeout);
  };

  const keepLoggedIn = () => {
    triggerRefresh(true);
    setIsModalVisible(false);
    modalVisibilityRef.current = false;
    clearTimeouts();
  };

  const triggerLogout = () => {
    clientNukeAuth(false);
    setIsModalVisible(false);
    modalVisibilityRef.current = false;
    router.push(buildRedirectUrl(currentPath));
  };

  const warn = () => {
    setCounter(60);
    counterTimeout = setInterval(() => {
      setCounter((prev) => {
        if (prev === 1) {
          triggerLogout();
        }
        return prev - 1;
      });
    }, 1000);
    setIsModalVisible(true);
    modalVisibilityRef.current = true;
  };

  const setTimeouts = () => {
    if (!modalVisibilityRef.current) {
      logoutTimeout = setTimeout(warn, SIGN_OUT_TIME);
    }
  };

  useEffect(() => {
    if (refrehToken !== null && refrehToken !== "") {
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
  }, [refrehToken]);

  useEffect(() => {
    if (typeof refrehTokenExpDate === "number" && refrehTokenExpDate !== 0) {
      const difference = dayjs(refrehTokenExpDate).diff(dayjs()) - 30000;
      refreshTimeout = setTimeout(() => {
        triggerRefresh(true);
      }, difference);
    }

    return () => {
      refreshTimeout && clearTimeout(refreshTimeout);
    };
  }, [refrehTokenExpDate]);

  if (!isVerificationInProgress || isAuthRoute) {
    return (
      <>
        {children}
        <Modal
          visible={isModalVisible}
          title={t("session-guard:ACCOUNT_INACTIVITY")}
          closable={false}
          footer={[
            <Button key="accept" type="primary" onClick={keepLoggedIn}>
              {t("session-guard:KEEP_ME_LOGGED_IN")}
            </Button>,
            <Button key="logOut" type="primary" onClick={triggerLogout}>
              {t("session-guard:LOGOUT")}
            </Button>,
          ]}
        >
          <div data-testid="modalContent">
            {t("session-guard:YOU_WILL_BE_LOGGED_OUT", { time: counter })}
          </div>
        </Modal>
      </>
    );
  }
  return <Spinner overlay={true} label={t("SESSION_VALIDATION")} />;
};

export default SessionGuard;
