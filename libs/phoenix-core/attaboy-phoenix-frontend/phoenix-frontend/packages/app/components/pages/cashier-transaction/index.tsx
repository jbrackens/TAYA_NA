import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { CoreSpin } from "./../../ui/spin";
import { useApi } from "../../../services/api/api-service";
import { Container } from "./index.styled";
import { StyledResultComponent, StatusEnum } from "../../results";
import { hideCashierDrawer } from "../../../lib/slices/cashierSlice";
import { CoreButton } from "../../ui/button";

const CHECK_STATUS_INTERVAL = 1000;
const CHECK_STATUS_MAX_RETRIES = 30;

enum PaymentStatusEnum {
  INITIATED = "INITIATED",
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  REFUSED = "REFUSED",
  INTERRUPTED = "INTERRUPTED",
}

function CashierTransaction() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t } = useTranslation(["cashier"]);
  const { txStatus, txId, txDirection, txAdditionalMessage } = router.query as {
    txStatus: string;
    txId: string;
    txDirection: string;
    txAdditionalMessage?: string;
  };
  const getTransaction = useApi(`payments/transactions/${txId}`, "GET");
  const [status, setStatus] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [checkStatusCount, setCheckStatusCount] = useState(0);

  useEffect(() => {
    if (!txId) return;
    if (
      txStatus === PaymentStatusEnum.PENDING &&
      checkStatusCount <= CHECK_STATUS_MAX_RETRIES
    ) {
      setTimeout(() => {
        getTransaction.triggerApi();
      }, CHECK_STATUS_INTERVAL);
      return;
    }

    setStatus(txStatus);
    setIsLoading(false);
  }, [checkStatusCount]);

  useEffect(() => {
    const data = getTransaction.data;
    if (!data) return;
    if (
      data.status === PaymentStatusEnum.PENDING ||
      data.status === PaymentStatusEnum.INITIATED
    ) {
      setCheckStatusCount(checkStatusCount + 1);
      return;
    }

    setStatus(data.status);
    setIsLoading(false);
  }, [getTransaction.statusOk]);

  useEffect(() => {
    const error = getTransaction.error;
    if (error) setIsLoading(false);
  }, [getTransaction.error]);

  const closeCashier = () => {
    dispatch(hideCashierDrawer());
  };

  const renderResult = () => {
    switch (status) {
      case PaymentStatusEnum.SUCCEEDED:
        return (
          <StyledResultComponent
            status={StatusEnum.SUCCESS}
            title={t(`TX_STATUS_SUCCEEDED_TITLE`, {
              direction: txDirection,
            })}
            subTitle={
              <>
                {t(`TX_STATUS_SUCCEEDED_SUB_TITLE`, {
                  id: txId,
                })}
                <br />
                {""}
                <br />
                {txAdditionalMessage ? t(txAdditionalMessage) : ""}
              </>
            }
            extra={[
              <CoreButton
                type="primary"
                key="1"
                href={`/cashier?tab=${txDirection}`}
              >
                {t(`${txDirection.toUpperCase()}_AGAIN_BUTTON`)}
              </CoreButton>,
            ]}
          />
        );
        break;
      case PaymentStatusEnum.FAILED:
        return (
          <StyledResultComponent
            status={StatusEnum.ERROR}
            title={t(`TX_STATUS_FAILED_TITLE`, {
              direction: txDirection,
            })}
            subTitle={t(`TX_STATUS_FAILED_SUB_TITLE`, {
              id: txId,
            })}
            extra={[
              <CoreButton
                type="primary"
                key="2"
                href={`/cashier?tab=${txDirection}`}
              >
                {t("TRY_AGAIN_BUTTON")}
              </CoreButton>,
            ]}
          />
        );
        break;
      case PaymentStatusEnum.REFUSED:
        return (
          <StyledResultComponent
            status={StatusEnum.ERROR}
            title={t(`TX_STATUS_REFUSED_TITLE`, {
              direction: txDirection,
            })}
            subTitle={t(`TX_STATUS_REFUSED_SUB_TITLE`, {
              id: txId,
            })}
            extra={[
              <CoreButton
                type="primary"
                key="2"
                href={`/cashier?tab=${txDirection}`}
              >
                {t("TRY_AGAIN_BUTTON")}
              </CoreButton>,
            ]}
          />
        );
        break;
      case PaymentStatusEnum.CANCELLED:
      case PaymentStatusEnum.INTERRUPTED:
        return (
          <StyledResultComponent
            status={StatusEnum.ERROR}
            title={t(`TX_STATUS_CANCELLED_TITLE`, {
              direction: txDirection,
            })}
            subTitle={t(`TX_STATUS_CANCELLED_SUB_TITLE`, {
              id: txId,
            })}
            extra={[
              <CoreButton
                type="primary"
                key="3"
                href={`/cashier?tab=${txDirection}`}
              >
                {t("TRY_AGAIN_BUTTON")}
              </CoreButton>,
            ]}
          />
        );
        break;
      default:
        return (
          <StyledResultComponent
            status={StatusEnum.WARNING}
            title={t(`TX_STATUS_UNKNOWN_TITLE`, {
              direction: txDirection,
            })}
            subTitle={t(`TX_STATUS_UNKNOWN_SUB_TITLE`, {
              id: txId,
            })}
            extra={[
              <CoreButton type="primary" key="4" onClick={closeCashier}>
                {t("OKAY_BUTTON")}
              </CoreButton>,
            ]}
          />
        );
        break;
    }
  };

  return (
    <>
      <Container>
        {isLoading ? <CoreSpin size="large" /> : renderResult()}
      </Container>
    </>
  );
}

CashierTransaction.namespacesRequired = [...defaultNamespaces, "cashier"];

export default CashierTransaction;
