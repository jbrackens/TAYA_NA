import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { message } from "antd";
import { useTranslation } from "i18n";
import { AppShell } from "../app-shell";
import { SportsbookTopBarActions, SportsbookTopBarNav } from "./top-bar";
import { SportsbookLeftNav } from "./left-nav";
import {
  SportsbookCenterStack,
  SportsbookContentCard,
  SportsbookRightRailFrame,
  SportsbookStatusSlot,
  SportsbookTopBarBrand,
  SportsbookTopBarBrandMark,
} from "./index.styled";
import {
  SportsbookMobileActionBar,
  SportsbookMobileBottomNav,
} from "./mobile-chrome";
import { BetslipComponent } from "../../layout/betslip";
import { LoginComponent } from "../../auth/login";
import { RegisterComponent } from "../../auth/register";
import { ForgotPasswordComponent } from "../../auth/forgot-reset-password/forgot-password";
import { ResetPasswordComponent } from "../../auth/forgot-reset-password/reset-password";
import { CashierDrawerComponent } from "../../cashier";
import { EmailConfirmationComponent } from "../../auth/email-confirmation";
import { AcceptTermsComponent } from "../../auth/accept-terms";
import { SessionTimerComponent } from "../../auth/session-timer";
import { IdleActivityComponent } from "../../auth/idle-activity";
import { IdComplyModalComponent } from "../../id-comply-modal";
import { LiveChatComponent } from "../../layout/live-chat";
import { GeoComplyError } from "../../geocomply";
import { WsChannelComponent } from "../../auth/ws-channel";
import { DepositThresholdComponent } from "../../auth/deposit-threshold-modal";
import { AccountStatusBar } from "../../account-status-bar";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { FullScreenWrapper } from "../../layout/sidebar/full-screen-wrapper";
import { useProfile, useSports } from "../../../services/go-api";
import type { AppError } from "../../../services/go-api";
import { transformGoSports } from "../../../services/go-api/events/events-transforms";
import { transformGoUserProfileToSettingsData } from "../../../services/go-api/user/user-transforms";
import type { SportsResponse } from "../../../services/api/contracts";
import {
  hideWsErrorModal,
  selectIsLoggedIn,
  selectWsErrorModalVisible,
  showAuthModal,
  showRegisterModal,
} from "../../../lib/slices/authSlice";
import {
  resetUserData,
  selectIsAccountDataUpdateNeeded,
  setIsAccountDataUpdateNeeded,
  setIsUserDataLoading,
  setOddsFormat,
  setUserData,
} from "../../../lib/slices/settingsSlice";
import { setSports } from "../../../lib/slices/sportSlice";
import {
  DisplayOddsEnum,
  useLocalStorageVariables,
  useResize,
} from "@phoenix-ui/utils";
import { IntegrationMode, parseIntegrationMode } from "../../../lib/integration-mode";
import { canonicalizeSportRouteKey } from "../../../lib/sports-routing";
import { ModalTypeEnum } from "../../layout";

const {
  SPORTSBOOK_INTEGRATION_MODE,
} = require("next/config").default().publicRuntimeConfig;

type SportsbookLayoutProps = {
  children: ReactNode;
};

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
    .map((entry) => {
      const canonicalSportKey = canonicalizeSportRouteKey(entry.sportKey);
      return {
        id: canonicalSportKey,
        abbreviation: canonicalSportKey,
        name: canonicalSportKey === "esports" ? "Esports" : entry.displayName,
        displayToPunters: true,
        tournaments: [],
      };
    });
};

const normalizeSport = (
  sport: SportsResponse[number],
): SportsResponse[number] => {
  const canonicalSportKey = canonicalizeSportRouteKey(
    sport.abbreviation || sport.id,
  );

  return {
    ...sport,
    id: canonicalSportKey,
    abbreviation: canonicalSportKey,
    name: canonicalSportKey === "esports" ? "Esports" : sport.name,
  };
};

const mergeSportsLists = (
  legacySports: SportsResponse | undefined,
  oddsFeedSports: SportsResponse,
): SportsResponse => {
  const merged = new Map<string, SportsResponse[number]>();
  (legacySports || []).forEach((sport) => {
    const normalizedSport = normalizeSport(sport);
    merged.set(normalizedSport.abbreviation, normalizedSport);
  });
  oddsFeedSports.forEach((sport) => {
    const normalizedSport = normalizeSport(sport);
    if (!merged.has(normalizedSport.abbreviation)) {
      merged.set(normalizedSport.abbreviation, normalizedSport);
    }
  });
  return Array.from(merged.values());
};

export const SportsbookLayout: React.FC<SportsbookLayoutProps> = ({ children }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation(["ws-service-error", "api-errors"]);
  const { getOddsFormat } = useLocalStorageVariables();
  const layoutRef = React.useRef(typeof document !== "undefined" && document.body);
  const { width } = useResize(layoutRef);
  const [oddsFeedSports, setOddsFeedSports] = useState<SportsResponse>([]);
  const [isMobileBetslipOpen, setIsMobileBetslipOpen] = useState(false);

  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isWsErrorModalVisible = useSelector(selectWsErrorModalVisible);
  const isAccountDataUpdateNeeded = useSelector(selectIsAccountDataUpdateNeeded);
  const profileQuery = useProfile();
  const sportsQuery = useSports();
  const { emailToken, showModal, punterId } = router.query as {
    emailToken?: string;
    showModal?: ModalTypeEnum;
    punterId?: string;
  };

  const oddsFormat = typeof localStorage !== "undefined" ? getOddsFormat() : "";
  const integrationMode = useMemo(
    () => parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
    [],
  );
  const isOddsFeedMode = integrationMode === IntegrationMode.ODDS_FEED;
  const goSportsAsLegacy = useMemo(
    () => (sportsQuery.data ? transformGoSports(sportsQuery.data.sports) : undefined),
    [sportsQuery.data],
  );
  const mergedSports = useMemo(
    () => mergeSportsLists(goSportsAsLegacy, oddsFeedSports),
    [goSportsAsLegacy, oddsFeedSports],
  );
  const isTabletViewport = width < 1200;
  const isMobileViewport = width < 768;

  useEffect(() => {
    if (!isTabletViewport) {
      setIsMobileBetslipOpen(false);
    }
  }, [isTabletViewport]);

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
        if (isMounted) {
          setOddsFeedSports(mapOddsFeedRegistryToSports(payload.sports));
        }
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
  }, [dispatch, oddsFormat]);

  useEffect(() => {
    if (
      (isLoggedIn && isAccountDataUpdateNeeded) ||
      (isLoggedIn && router.pathname.includes("account"))
    ) {
      profileQuery.refetch();
    }
  }, [isLoggedIn, isAccountDataUpdateNeeded, router.pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      dispatch(resetUserData());
    }
  }, [dispatch, isLoggedIn]);

  useEffect(() => {
    if (profileQuery.data) {
      dispatch(setUserData(transformGoUserProfileToSettingsData(profileQuery.data)));
    }
  }, [dispatch, profileQuery.data]);

  useEffect(() => {
    dispatch(setIsUserDataLoading(profileQuery.isLoading));
  }, [dispatch, profileQuery.isLoading]);

  useEffect(() => {
    if (profileQuery.isError && profileQuery.error) {
      const appErr = profileQuery.error as AppError;
      appErr.payload?.errors?.forEach((error: { errorCode: string }) => {
        message.error(t(`api-errors:${error.errorCode}`));
      });
    }
    dispatch(setIsAccountDataUpdateNeeded(false));
  }, [dispatch, profileQuery.isError, profileQuery.error, t]);

  useEffect(() => {
    if (sportsQuery.isLoading || mergedSports.length === 0) {
      return;
    }
    dispatch(setSports(mergedSports));
  }, [dispatch, sportsQuery.isLoading, mergedSports]);

  useEffect(() => {
    if (!showModal) {
      return;
    }
    if (showModal === ModalTypeEnum.LOGIN) {
      dispatch(showAuthModal());
    }
    if (showModal === ModalTypeEnum.REGISTER) {
      dispatch(showRegisterModal());
    }
  }, [dispatch, showModal]);

  useEffect(() => {
    if (emailToken) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [emailToken, router]);

  const onWsErrorModalOk = () => {
    router.reload();
  };

  return (
    <>
      <AppShell
        topBarLeft={
          <SportsbookTopBarBrand>
            <SportsbookTopBarBrandMark />
            Attaboy Sports
          </SportsbookTopBarBrand>
        }
        topBarCenter={<SportsbookTopBarNav />}
        topBarRight={<SportsbookTopBarActions />}
        leftRail={<SportsbookLeftNav />}
        centerContent={
          <SportsbookCenterStack>
            {isLoggedIn ? (
              <SportsbookStatusSlot>
                <AccountStatusBar />
              </SportsbookStatusSlot>
            ) : null}
            <SportsbookContentCard>{children}</SportsbookContentCard>
          </SportsbookCenterStack>
        }
        rightRail={
          <SportsbookRightRailFrame>
            <BetslipComponent />
          </SportsbookRightRailFrame>
        }
        mobileActionBar={
          isTabletViewport ? (
            <SportsbookMobileActionBar
              onOpenBetslip={() => setIsMobileBetslipOpen(true)}
            />
          ) : undefined
        }
        bottomNav={
          isMobileViewport ? (
            <SportsbookMobileBottomNav
              onOpenBetslip={() => setIsMobileBetslipOpen(true)}
            />
          ) : undefined
        }
      />

      {isTabletViewport ? (
        <FullScreenWrapper
          isMobileFooterVisible={true}
          isOpen={isMobileBetslipOpen}
          setIsOpen={setIsMobileBetslipOpen}
          showTrigger={false}
        >
          <BetslipComponent />
        </FullScreenWrapper>
      ) : null}

      <LoginComponent />
      <RegisterComponent />
      <ForgotPasswordComponent />
      <ResetPasswordComponent />
      <CashierDrawerComponent />
      <EmailConfirmationComponent emailToken={emailToken} />
      <AcceptTermsComponent />
      <SessionTimerComponent />
      <IdleActivityComponent />
      <IdComplyModalComponent punterId={punterId} showModal={showModal} />
      <LiveChatComponent />
      <GeoComplyError />
      <WsChannelComponent />
      <DepositThresholdComponent />
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
    </>
  );
};
