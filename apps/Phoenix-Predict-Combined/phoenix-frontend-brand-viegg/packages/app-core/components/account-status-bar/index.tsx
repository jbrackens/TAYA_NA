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
import { CoreButton } from "../ui/button";
import {
  selectCurrentBalance,
  showCashierDrawer,
} from "../../lib/slices/cashierSlice";
import { useStartIdpv } from "../../services/go-api";
import type { AppError } from "../../services/go-api";

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
  const startIdpvMutation = useStartIdpv();

  useEffect(() => {
    if (startIdpvMutation.data?.idpvRedirectUrl) {
      window.location.replace(startIdpvMutation.data.idpvRedirectUrl);
    }
  }, [startIdpvMutation.data]);

  useEffect((): any => {
    setBalance(currentBalance);
  }, [currentBalance]);

  useEffect(() => {
    const idpvError = startIdpvMutation.error as AppError | undefined;
    if (idpvError) {
      idpvError.payload?.errors?.forEach((err: { errorCode: string }) => {
        message.error(t(`api-errors:${err.errorCode}`));
      });
      startIdpvMutation.reset();
    }
  }, [startIdpvMutation.error]);

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
                  onClick={() => startIdpvMutation.mutate()}
                  loading={startIdpvMutation.isLoading}
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
    </>
  );
};

export { AccountStatusBar };
