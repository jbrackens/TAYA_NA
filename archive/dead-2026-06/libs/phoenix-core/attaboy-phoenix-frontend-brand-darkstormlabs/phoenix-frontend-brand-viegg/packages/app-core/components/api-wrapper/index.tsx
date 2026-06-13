import React, { useEffect, ReactNode, useState } from "react";
import WebsocketContext from "./websocket-context";
import GeocomplyContext from "./geocomply-context";
import { useWebsocket } from "../../services/websocket/websocket-service";
import { useDispatch, useSelector } from "react-redux";
import { useToken, useSpy } from "@phoenix-ui/utils";
import { logIn, selectIsLoggedIn } from "../../lib/slices/authSlice";
import { AuthWrapper } from "../auth/auth-wrapper";
import { ChannelSubscriptionManager } from "../../services/websocket/channel-subscription-manager";
import { useGeolocation } from "../../services/geocomply";
import { ResultModalComponent } from "../modals/result-modal";
import { StatusEnum } from "../results";
import { useTranslation } from "i18n";
import dayjs from "dayjs";

type ApiWrapperProps = {
  children: ReactNode;
  disableWebsocket: boolean;
  disableGeoComply: boolean;
};

const ApiWrapper: React.FC<ApiWrapperProps> = ({
  children,
  disableWebsocket,
  disableGeoComply,
}) => {
  const { t } = useTranslation(["header", "responsible-gaming"]);
  const [isInfoModalVisible, setIsInfoModalVisvisible] = useState(false);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const { spy } = useSpy();
  const websocketApi = useWebsocket();
  const geocomply = useGeolocation();
  const { getToken, getRefreshTokenExpDate } = useToken();
  const token = typeof localStorage !== "undefined" ? getToken() : "";
  const refreshTokenExpDate =
    typeof localStorage !== "undefined"
      ? getRefreshTokenExpDate() || undefined
      : undefined;
  const dispatch = useDispatch();

  const isRefreshTokenValid = dayjs(refreshTokenExpDate).isAfter(dayjs());

  useEffect(() => {
    if (disableGeoComply) {
      geocomply.disable();
    }

    if (token && isRefreshTokenValid) {
      dispatch(logIn());
    }
  }, []);

  useEffect(() => {
    if (!websocketApi.isConnectionOpen && !disableWebsocket) {
      websocketApi.openConnection();
    }
  }, [disableWebsocket]);

  const showModalBasedOnLoginState = (values: any) => {
    if (!values.values && values.prevValues) {
      setIsInfoModalVisvisible(true);
    }
  };

  spy(isLoggedIn, showModalBasedOnLoginState);

  return (
    <>
      <WebsocketContext.Provider value={websocketApi}>
        <AuthWrapper isLoggedIn={token && isRefreshTokenValid ? true : false}>
          <GeocomplyContext.Provider value={geocomply}>
            <ChannelSubscriptionManager>{children}</ChannelSubscriptionManager>
          </GeocomplyContext.Provider>
        </AuthWrapper>
      </WebsocketContext.Provider>
      <ResultModalComponent
        status={StatusEnum.INFO}
        title={t("responsible-gaming:LOGOUT")}
        subTitle={t("responsible-gaming:CALL_GAMBLER")}
        okText={t("header:OK")}
        isVisible={isInfoModalVisible}
        onOk={() => setIsInfoModalVisvisible(false)}
      />
    </>
  );
};
export default ApiWrapper;
