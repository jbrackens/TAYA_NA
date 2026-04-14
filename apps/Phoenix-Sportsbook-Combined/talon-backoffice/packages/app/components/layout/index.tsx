import React, { ReactNode, useState, useEffect, useRef } from "react";
import { HeaderComponent } from "./header";
import { SidebarComponent } from "./sidebar";
import { BetslipComponent } from "./betslip";
import { LoginComponent } from "../auth/login";
import { RegisterComponent } from "../auth/register";
import { LayoutWrapper, BetslipContainer, StyledLayout } from "./index.styled";
import { FullScreenWrapper } from "./sidebar/full-screen-wrapper";
import { MobileSidebarComponent } from "./sidebar/mobile-sidebar-games-list";
import { UpperFooterComponent } from "./footer/upper-footer";
import { MainFooterComponent } from "./footer/main-footer";
import { MobileFooterComponent } from "./footer/mobile-footer";
import { LiveChatComponent } from "./live-chat";
import { useSelector, useDispatch } from "react-redux";
import { setSports } from "../../lib/slices/sportSlice";
import { useApi } from "../../services/api/api-service";
import {
  selectIsLoggedIn,
  selectWsErrorModalVisible,
  showAuthModal,
  hideWsErrorModal,
  showRegisterModal,
} from "../../lib/slices/authSlice";
import {
  setUserData,
  setIsUserDataLoading,
  selectIsAccountDataUpdateNeeded,
  resetUserData,
  setIsAccountDataUpdateNeeded,
  setOddsFormat,
} from "../../lib/slices/settingsSlice";
import { useRouter } from "next/router";
import {
  useResize,
  useLocalStorageVariables,
  DisplayOddsEnum,
} from "@phoenix-ui/utils";
import { CashierDrawerComponent } from "../cashier";
import { useTranslation } from "i18n";
import { EmailConfirmationComponent } from "../../components/auth/email-confirmation";
import { AcceptTermsComponent } from "../../components/auth/accept-terms";
import { AccountStatusBar } from "../account-status-bar";
import { SessionTimerComponent } from "../../components/auth/session-timer";
import { IdleActivityComponent } from "../auth/idle-activity";
import { WsChannelComponent } from "../auth/ws-channel";
import { DepositThresholdComponent } from "../auth/deposit-threshold-modal";
import { GeoComplyError } from "../geocomply";
import { IdComplyModalComponent } from "../id-comply-modal";
import { ResultModalComponent } from "../modals/result-modal";
import { StatusEnum } from "../results";
import { ResetPasswordComponent } from "../auth/forgot-reset-password/reset-password";
import { ForgotPasswordComponent } from "../auth/forgot-reset-password/forgot-password";
import { message } from "antd";

type LayoutComponentProps = {
  children: ReactNode;
  home?: Boolean | undefined;
};

export enum ModalTypeEnum {
  LOGIN = "LOGIN",
  REGISTER = "REGISTER",
  IDCOMPLY = "IDCOMPLY",
}

const { Content } = LayoutWrapper;

const Layout: React.FC<LayoutComponentProps> = ({
  children,
}: LayoutComponentProps) => {
  const [isGamesListVisible, setIsGamesListVisible] = useState(false);
  const isGamesListVisibleRef = useRef<boolean>();
  isGamesListVisibleRef.current = isGamesListVisible;
  const [isMobileFooterVisible, setIsMobileFooterVisible] = useState(true);
  const isWsErrorModalVisible = useSelector(selectWsErrorModalVisible);
  const { t } = useTranslation(["ws-service-error", "api-errors"]);
  const dispatch = useDispatch();
  const isAccountDataUpdateNeeded = useSelector(
    selectIsAccountDataUpdateNeeded,
  );
  const router = useRouter();
  const getMeData = useApi("profile/me", "GET");
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const layoutRef = useRef(typeof document !== "undefined" && document.body);
  const { width } = useResize(layoutRef);
  const { emailToken, showModal, punterId } = router.query as {
    emailToken?: string;
    showModal?: ModalTypeEnum;
    punterId?: string;
  };
  const { getOddsFormat } = useLocalStorageVariables();
  const oddsFormat = typeof localStorage !== "undefined" ? getOddsFormat() : "";

  useEffect(() => {
    fetchSports.triggerApi();
  }, []);

  useEffect(() => {
    if (oddsFormat !== "") {
      dispatch(setOddsFormat(oddsFormat as DisplayOddsEnum));
    }
  }, [oddsFormat]);

  //fixing link which is not scrolling to the top of the page when triggered
  router?.events?.on("routeChangeComplete", () => {
    window.scrollTo(0, 0);
  });

  useEffect(() => {
    if (emailToken) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [emailToken]);

  useEffect(() => {
    if (
      (isLoggedIn && isAccountDataUpdateNeeded) ||
      (isLoggedIn && router?.pathname.includes("account"))
    ) {
      getMeData.triggerApi();
    }
  }, [isLoggedIn, isAccountDataUpdateNeeded]);

  useEffect(() => {
    if (!isLoggedIn) {
      dispatch(resetUserData());
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (getMeData.data) {
      dispatch(setUserData(getMeData.data));
    }
  }, [getMeData.data]);

  useEffect(() => {
    dispatch(setIsUserDataLoading(getMeData.isLoading));
  }, [getMeData.isLoading]);

  useEffect(() => {
    if (!getMeData.statusOk && getMeData.statusOk !== undefined) {
      getMeData.error?.payload?.errors.forEach(
        (error: { errorCode: string }) => {
          message.error(t(`api-errors:${error.errorCode}`));
        },
      );

      getMeData.resetHookState();
    }
    dispatch(setIsAccountDataUpdateNeeded(false));
  }, [getMeData.statusOk]);

  const fetchSports = useApi("sports", "GET");

  useEffect(() => {
    if (fetchSports.isLoading) return;
    if (!fetchSports.data) return;

    dispatch(setSports(fetchSports.data));
  }, [fetchSports.data]);

  const ref = useRef() as React.MutableRefObject<HTMLDivElement>;

  const handleClick = (e: MouseEvent) => {
    if (ref.current !== null && e.target instanceof Node && !ref.current.contains(e.target)) {
      setIsGamesListVisible(false);
    }
  };

  useEffect(() => {
    const handleRouteChange = () => {
      if (isGamesListVisibleRef.current) {
        setIsGamesListVisible(false);
      }
    };
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [ref]);

  const onWsErrorModalOk = () => {
    router?.reload();
  };

  useEffect(() => {
    if (!showModal) return;

    if (showModal === ModalTypeEnum.LOGIN) {
      dispatch(showAuthModal());
    }

    if (showModal === ModalTypeEnum.REGISTER) {
      dispatch(showRegisterModal());
    }
  }, [showModal]);

  return (
    <StyledLayout>
      <StyledLayout hasSider={true}>
        <SidebarComponent ref={ref} isLoading={fetchSports.isLoading} />
        <StyledLayout>
          <HeaderComponent
            setIsGamesListVisible={setIsGamesListVisible}
            layoutWidth={width}
          />
          <StyledLayout main={true ? 1 : 0}>
            <Content
              style={{
                paddingTop: "85px",
              }}
            >
              <AccountStatusBar />
              {children}
              <>
                {width < 1200 ? (
                  <FullScreenWrapper
                    isMobileFooterVisible={isMobileFooterVisible}
                  >
                    <BetslipComponent />
                  </FullScreenWrapper>
                ) : (
                  <></>
                )}
              </>
              <MobileSidebarComponent
                isGamesListVisible={isGamesListVisible}
                ref={ref}
                isLoading={fetchSports.isLoading}
              />
              <LoginComponent />
              <RegisterComponent />
              <ForgotPasswordComponent />
              <ResetPasswordComponent />
              <CashierDrawerComponent />
              <EmailConfirmationComponent emailToken={emailToken} />
              <AcceptTermsComponent />
              <SessionTimerComponent />
              <IdleActivityComponent />
              <IdComplyModalComponent
                punterId={punterId}
                showModal={showModal}
              />
              <MobileFooterComponent
                setIsMobileFooterVisible={setIsMobileFooterVisible}
              />
              <LiveChatComponent />
              <GeoComplyError />
              <WsChannelComponent />
              <DepositThresholdComponent />
            </Content>
            {width >= 1200 ? (
              <BetslipContainer width={350}>
                <BetslipComponent />
              </BetslipContainer>
            ) : (
              <></>
            )}
          </StyledLayout>
          <UpperFooterComponent />
        </StyledLayout>
      </StyledLayout>
      <MainFooterComponent />
      <ResultModalComponent
        status={StatusEnum.WARNING}
        title={t("ERROR_HEADER")}
        subTitle={t("ERROR_CONTENT")}
        onOk={onWsErrorModalOk}
        okText={t("REFRESH")}
        onCancel={() => dispatch(hideWsErrorModal())}
        cancelText={t("DISMISS")}
        isVisible={isWsErrorModalVisible}
      />
    </StyledLayout>
  );
};

export { Layout };
