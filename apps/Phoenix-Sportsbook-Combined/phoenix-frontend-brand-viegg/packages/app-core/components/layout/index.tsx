import React, { ReactNode, useState, useEffect, useRef, useMemo } from "react";
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
import { useSports as useGoSports, useProfile } from "../../services/go-api";
import { transformGoSports } from "../../services/go-api/events/events-transforms";
import { transformGoUserProfileToSettingsData } from "../../services/go-api/user/user-transforms";
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
import {
  ApiErrorItem,
  SportsResponse,
} from "../../services/api/contracts";
import type { AppError } from "../../services/go-api";
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
import { IntegrationMode, parseIntegrationMode } from "../../lib/integration-mode";

const {
  SPORTSBOOK_INTEGRATION_MODE,
} = require("next/config").default().publicRuntimeConfig;

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

type OddsFeedSportRegistryEntry = {
  sportKey: string;
  displayName: string;
  enabled: boolean;
};

type OddsFeedSportsResponse = {
  sports: OddsFeedSportRegistryEntry[];
};

const mapOddsFeedRegistryToSports = (
  registry: OddsFeedSportRegistryEntry[] | undefined,
): SportsResponse => {
  if (!Array.isArray(registry)) {
    return [];
  }
  return registry
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      id: entry.sportKey,
      abbreviation: entry.sportKey,
      name: entry.displayName,
      displayToPunters: true,
      tournaments: [],
    }));
};

const mergeSportsLists = (
  legacySports: SportsResponse | undefined,
  oddsFeedSports: SportsResponse,
): SportsResponse => {
  const merged = new Map<string, SportsResponse[number]>();
  (legacySports || []).forEach((sport) => {
    merged.set(sport.abbreviation, sport);
  });
  oddsFeedSports.forEach((sport) => {
    if (!merged.has(sport.abbreviation)) {
      merged.set(sport.abbreviation, sport);
    }
  });
  return Array.from(merged.values());
};

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
  const profileQuery = useProfile();
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
  const integrationMode = useMemo(
    () => parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
    [],
  );
  const isOddsFeedMode = integrationMode === IntegrationMode.ODDS_FEED;
  const [oddsFeedSports, setOddsFeedSports] = useState<SportsResponse>([]);

  // Sports are fetched automatically by useSports() React Query hook.
  const goSportsQuery = useGoSports();

  useEffect(() => {
    if (!isOddsFeedMode) {
      setOddsFeedSports([]);
      return;
    }

    let isMounted = true;
    const loadOddsFeedSports = async () => {
      try {
        const response = await fetch("/api/odds-feed/sports/");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as OddsFeedSportsResponse;
        if (!isMounted) {
          return;
        }
        setOddsFeedSports(mapOddsFeedRegistryToSports(payload.sports));
      } catch (_error) {
        if (isMounted) {
          setOddsFeedSports([]);
        }
      }
    };

    loadOddsFeedSports();
    return () => {
      isMounted = false;
    };
  }, [isOddsFeedMode]);

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

  // Refetch profile when account data update is needed
  useEffect(() => {
    if (
      (isLoggedIn && isAccountDataUpdateNeeded) ||
      (isLoggedIn && router?.pathname.includes("account"))
    ) {
      profileQuery.refetch();
    }
  }, [isLoggedIn, isAccountDataUpdateNeeded]);

  useEffect(() => {
    if (!isLoggedIn) {
      dispatch(resetUserData());
    }
  }, [isLoggedIn]);

  // Sync profile data to Redux when it arrives
  useEffect(() => {
    if (profileQuery.data) {
      dispatch(setUserData(transformGoUserProfileToSettingsData(profileQuery.data)));
    }
  }, [profileQuery.data]);

  useEffect(() => {
    dispatch(setIsUserDataLoading(profileQuery.isLoading));
  }, [profileQuery.isLoading]);

  useEffect(() => {
    if (profileQuery.error) {
      const appError = profileQuery.error as AppError;
      appError?.payload?.errors?.forEach((error: ApiErrorItem) => {
        message.error(t(`api-errors:${error.errorCode}`));
      });
    }
    dispatch(setIsAccountDataUpdateNeeded(false));
  }, [profileQuery.error]);

  // Transform Go sports → existing SportsResponse shape and merge with odds feed
  const goSportsData = useMemo(
    () => (goSportsQuery.data ? transformGoSports(goSportsQuery.data.sports) : []),
    [goSportsQuery.data],
  );
  const mergedSports = useMemo(
    () => mergeSportsLists(goSportsData.length > 0 ? goSportsData : undefined, oddsFeedSports),
    [goSportsData, oddsFeedSports],
  );

  useEffect(() => {
    if (goSportsQuery.isLoading) return;
    if (mergedSports.length === 0) return;

    dispatch(setSports(mergedSports));
  }, [goSportsQuery.isLoading, mergedSports]);

  const ref = useRef() as React.MutableRefObject<HTMLDivElement>;

  const handleClick = (e: any) => {
    //@ts-ignore
    if (ref.current !== null && !ref.current.contains(e.target)) {
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
        <SidebarComponent ref={ref} isLoading={goSportsQuery.isLoading} />
        <StyledLayout>
          <HeaderComponent
            setIsGamesListVisible={setIsGamesListVisible}
            layoutWidth={width}
          />
          <StyledLayout main={true ? 1 : 0}>
            <Content
              style={{
                paddingTop: "64px",
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
                isLoading={goSportsQuery.isLoading}
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
