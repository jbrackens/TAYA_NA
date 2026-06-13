import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "i18n";
import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { ContentContainer } from "./index.styles";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import { useApi } from "../../../services/api/api-service";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { useTimezone } from "@phoenix-ui/utils";
dayjs.extend(LocalizedFormat);

const SESSION_CHECK_INTERVAL = 1800000;
const TIME_CHECK_INTERVAL = 60000;

const SessionTimerComponent: React.FC = () => {
  const { t } = useTranslation(["session-timer"]);
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [sessionCheckIntervalValue, setSessionCheckIntervalValue] = useState(0);
  const { getTimeWithTimezone } = useTimezone();
  const sessionStart = useRef(0);
  const onOk = () => {
    setSessionModalVisible(false);
    triggerApi();
  };
  const { triggerApi, data } = useApi("punters/current-session", "GET");
  const currentSessionDataToDisplay = useApi("punters/current-session", "GET");

  useEffect(() => {
    if (data) {
      sessionStart.current = new Date(data.sessionStartTime).getTime();
      setTimeAndDuration();
    }
  }, [data]);

  useEffect(() => {
    if (currentSessionDataToDisplay.data) {
      const now = new Date(
        currentSessionDataToDisplay.data.currentTime,
      ).getTime();
      setCurrentTime(getTimeWithTimezone(dayjs(now)).format("llll"));
      const sessionDurationValue = now - sessionStart.current;
      setSessionDuration(Math.round((sessionDurationValue / (1000 * 60)) % 60));
      setSessionModalVisible(true);
    }
  }, [currentSessionDataToDisplay.data]);

  useEffect(() => {
    const newDataTriggerInterval = setInterval(() => {
      if (isSessionModalVisible) {
        currentSessionDataToDisplay.triggerApi();
      }
    }, TIME_CHECK_INTERVAL);

    return () => clearInterval(newDataTriggerInterval);
  }, [isSessionModalVisible]);

  const setTimeAndDuration = () => {
    const now = new Date(data.currentTime).getTime();
    const sessionDuration = now - sessionStart.current;
    const periods = sessionDuration / SESSION_CHECK_INTERVAL;
    const periodsAfterCommaPart = Math.trunc(periods);
    const intervalValue =
      SESSION_CHECK_INTERVAL -
      SESSION_CHECK_INTERVAL * (periods - periodsAfterCommaPart);
    setSessionCheckIntervalValue(intervalValue);
  };

  useEffect(() => {
    if (sessionStart.current) {
      const sessionInterval: ReturnType<typeof setInterval> = setInterval(
        () => {
          if (!isSessionModalVisible) {
            // setSessionModalVisible(true);
            currentSessionDataToDisplay.triggerApi();
          }
        },
        sessionCheckIntervalValue,
      );

      return () => clearInterval(sessionInterval);
    }
  }, [sessionStart.current]);

  useEffect(() => {
    if (!isUserLoggedIn) {
      if (isSessionModalVisible) {
        setSessionModalVisible(false);
      }
      return;
    }
    triggerApi();

    return () => {
      sessionStart.current = 0;
    };
  }, [isUserLoggedIn]);

  return (
    <ResultModalComponent
      status={StatusEnum.INFO}
      title={t("TITLE")}
      subTitle={
        <ContentContainer>
          <p>
            <strong>{t("CURRENT_TIME")}:</strong> {currentTime}
          </p>
          <p>
            <strong>{t("SESSION_DURATION")}</strong> {sessionDuration}{" "}
            {t("MINUTES")}
          </p>
        </ContentContainer>
      }
      okText={t("OK")}
      onOk={onOk}
      isVisible={isSessionModalVisible}
    />
  );
};

export { SessionTimerComponent };
