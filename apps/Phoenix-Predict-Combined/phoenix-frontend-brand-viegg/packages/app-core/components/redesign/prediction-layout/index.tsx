import React, { ReactNode, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useTranslation } from "i18n";
import { AppShell } from "../app-shell";
import { PredictionTopBarNav } from "./top-bar";
import { PredictionLeftNav } from "./left-nav";
import { PredictionTradeRail } from "./trade-rail";
import { SportsbookTopBarActions } from "../sportsbook-layout/top-bar";
import {
  PredictionTopBarBrand,
  PredictionTopBarBrandMark,
} from "./index.styled";
import {
  PredictionMobileActionBar,
  PredictionMobileBottomNav,
} from "./mobile-chrome";
import { FullScreenWrapper } from "../../layout/sidebar/full-screen-wrapper";
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
import { ModalTypeEnum } from "../../layout";
import { hideWsErrorModal, selectIsLoggedIn, selectWsErrorModalVisible } from "../../../lib/slices/authSlice";
import { useResize } from "@phoenix-ui/utils";

export type PredictionLayoutProps = {
  children: ReactNode;
};

export const PredictionLayout: React.FC<PredictionLayoutProps> = ({
  children,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation(["ws-service-error"]);
  const layoutRef = React.useRef(typeof document !== "undefined" && document.body);
  const { width } = useResize(layoutRef);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isWsErrorModalVisible = useSelector(selectWsErrorModalVisible);
  const [isMobileTradeRailOpen, setIsMobileTradeRailOpen] = useState(false);
  const { emailToken, showModal, punterId } = router.query as {
    emailToken?: string;
    showModal?: string;
    punterId?: string;
  };
  const isTabletViewport = width < 1200;
  const isMobileViewport = width < 768;

  const onWsErrorModalOk = () => {
    router.reload();
  };

  return (
    <>
      <AppShell
        topBarLeft={
          <PredictionTopBarBrand>
            <PredictionTopBarBrandMark />
            Attaboy Prediction
          </PredictionTopBarBrand>
        }
        topBarCenter={<PredictionTopBarNav />}
        topBarRight={<SportsbookTopBarActions />}
        leftRail={<PredictionLeftNav />}
        centerContent={
          <>
            {isLoggedIn ? <AccountStatusBar /> : null}
            {children}
          </>
        }
        rightRail={<PredictionTradeRail />}
        mobileActionBar={
          isTabletViewport ? (
            <PredictionMobileActionBar
              onOpenTradeRail={() => setIsMobileTradeRailOpen(true)}
            />
          ) : undefined
        }
        bottomNav={
          isMobileViewport ? (
            <PredictionMobileBottomNav
              onOpenTradeRail={() => setIsMobileTradeRailOpen(true)}
            />
          ) : undefined
        }
      />

      {isTabletViewport ? (
        <FullScreenWrapper
          isMobileFooterVisible={true}
          isOpen={isMobileTradeRailOpen}
          setIsOpen={setIsMobileTradeRailOpen}
          showTrigger={false}
        >
          <PredictionTradeRail />
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
      <IdComplyModalComponent
        punterId={punterId}
        showModal={showModal as ModalTypeEnum | undefined}
      />
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
