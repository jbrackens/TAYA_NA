import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectAccountStatus,
  selectCoolOff,
} from "../../lib/slices/settingsSlice";
import { PunterStatusEnum, PunterCoolOffReasonEnum } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import { AccountStatusBarStyled } from "./index.styled";
import { message } from "antd";
import { useApi } from "../../services/api/api-service";
import { CoreButton } from "../ui/button";
import {
  selectCurrentBalance,
  showCashierDrawer,
} from "../../lib/slices/cashierSlice";

const AccountStatusBar: React.FC = () => {
  const { t } = useTranslation(["account-status-bar", "api-errors"]);
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [statusType, setStatusType] = useState<"error" | "warning" | "info">(
    "error",
  );
  const accountStatus = useSelector(selectAccountStatus);
  const coolOff = useSelector(selectCoolOff);
  const [balance, setBalance] = useState(0);
  const currentBalance = useSelector(selectCurrentBalance);
  const { data, triggerApi, error, isLoading, resetHookState } = useApi(
    "registration/start-idpv",
    "POST",
  );

  useEffect(() => {
    if (data && data.idpvRedirectUrl) {
      window.location.replace(data.idpvRedirectUrl);
    }
  }, [data]);

  useEffect((): any => {
    setBalance(currentBalance);
  }, [currentBalance]);

  useEffect(() => {
    if (error) {
      error.payload?.errors.forEach(
        (error: { details: string; errorCode: string }) => {
          message.error(t(`api-errors:${error.errorCode}`));
        },
      );

      resetHookState();
    }
  }, [error]);

  useEffect(() => {
    switch (accountStatus) {
      case (PunterStatusEnum.SELF_EXCLUDED,
      PunterStatusEnum.SUSPENDED,
      PunterStatusEnum.NEGATIVE_BALANCE):
        setShowStatusBar(true);
        setStatusType("error");
        break;
      case PunterStatusEnum.COOLING_OFF:
        setShowStatusBar(true);
        setStatusType("warning");
        break;
      case PunterStatusEnum.UNVERIFIED:
        setShowStatusBar(true);
        setStatusType("info");
        break;
      default:
        setShowStatusBar(false);
    }
  }, [accountStatus, coolOff]);

  const generateTitle = () => {
    let title: string =
      coolOff?.cause &&
      coolOff.cause === PunterCoolOffReasonEnum.SESSION_LIMIT_BREACH
        ? PunterCoolOffReasonEnum.SESSION_LIMIT_BREACH
        : accountStatus;

    if (balance < 0) {
      title = "NEGATIVE_BALANCE";
    }

    return title;
  };

  const dispatch = useDispatch();

  const dispatchShowCashierDrawer = () => {
    dispatch(showCashierDrawer());
  };

  return (
    <>
      {showStatusBar && (
        <>
          <AccountStatusBarStyled
            role="statusBar"
            message={t("TITLE")}
            description={t(generateTitle())}
            type={statusType}
            action={
              (accountStatus === PunterStatusEnum.UNVERIFIED && (
                <CoreButton
                  size="small"
                  type="primary"
                  onClick={triggerApi}
                  loading={isLoading}
                >
                  {t("VERIFY")}
                </CoreButton>
              )) ||
              (accountStatus === PunterStatusEnum.NEGATIVE_BALANCE && (
                <CoreButton
                  size="small"
                  type="primary"
                  onClick={dispatchShowCashierDrawer}
                >
                  {t("DEPOSIT")}
                </CoreButton>
              ))
            }
          />
          <br />
        </>
      )}
      <AccountStatusBarStyled
        role="statusBar"
        description={
          <>
            Dear Patrons,
            <br /> <br />
            We have made the difficult decision to close Vie.gg. The site will
            remain open until November 1, 2022. until then, you will be able to
            log in to close your account. Any accounts remaining open at that
            date will automatically be closed and any remaining balances of $1
            or more will be returned by check sent to the address registered on
            the applicable account.
            <br /> <br />
            If you have any questions, please contact our Customer Support team.
            We thank you for playing on our site.
          </>
        }
        type="info"
      />
    </>
  );
};

export { AccountStatusBar };
