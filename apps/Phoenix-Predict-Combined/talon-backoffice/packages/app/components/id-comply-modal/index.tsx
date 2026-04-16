import React, { useEffect } from "react";
import { useTranslation } from "i18n";
import { CoreSpin } from "./../ui/spin";
import { ModalTypeEnum } from "../layout";
import { PageMask } from "./index.styled";
import { useApi } from "../../services/api/api-service";
import { ResultModalComponent } from "../modals/result-modal";
import { StatusEnum } from "../results";
import { useQueryParams } from "@phoenix-ui/utils";
import { useState } from "react";

type Props = {
  punterId?: string;
  showModal?: ModalTypeEnum;
};

const ID_COMPLY_TIMEOUT_TIME = 2000;

const IdComplyModalComponent: React.FC<Props> = ({ showModal, punterId }) => {
  const { isLoading, triggerApi, data, error, resetHookState } = useApi(
    "registration/check-idpv-status",
    "POST",
  );
  const { t } = useTranslation(["id-comply", "api-errors"]);
  const queryParams = useQueryParams();
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [idComplyTimeout, setIdComplyTimeout] = useState<null | ReturnType<
    typeof setInterval
  >>(null);
  const [isExtendedLoading, setIsExtendedLoading] = useState(false);

  const clearIdComplyTimeoutAndQueries = () => {
    queryParams.remove("showModal");
    queryParams.remove("punterId");
    setIsExtendedLoading(false);
    if (idComplyTimeout) {
      clearTimeout(idComplyTimeout);
      setIdComplyTimeout(null);
    }
  };

  useEffect(() => {
    if (isLoading) {
      setIsExtendedLoading(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (error) {
      const photoVerificatiionNotCompleted = error.payload?.errors.some(
        (error: { errorCode: string }) =>
          error.errorCode === "photoVerificationNotCompleted",
      );
      if (photoVerificatiionNotCompleted) {
        setIdComplyTimeout(
          setTimeout(() => {
            triggerApi({ punterId });
          }, ID_COMPLY_TIMEOUT_TIME),
        );
        resetHookState();
        return;
      }
      clearIdComplyTimeoutAndQueries();
      setIsErrorVisible(true);
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      clearIdComplyTimeoutAndQueries();
      setIsSuccessVisible(true);
    }
  }, [data]);

  useEffect(() => {
    if (showModal === ModalTypeEnum.IDCOMPLY && punterId !== undefined) {
      triggerApi({ punterId });
    }
  }, [showModal, punterId]);

  const hideModal = () => {
    isErrorVisible && setIsErrorVisible(false);
    isSuccessVisible && setIsSuccessVisible(false);
    resetHookState();
  };

  return (
    <>
      {isExtendedLoading && (
        <PageMask>
          <CoreSpin spinning={true} />
        </PageMask>
      )}
      <ResultModalComponent
        status={StatusEnum.SUCCESS}
        title={t("VERIFICATION_SUCCESS")}
        subTitle={t("SUCCESS_CONTENT")}
        okText={t("OK")}
        isVisible={isSuccessVisible}
        onOk={hideModal}
      />
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={t("VERIFICATION_FAILED")}
        subTitle={
          <>
            {error?.payload?.errors.map((error: { errorCode: string }) => (
              <div key={error.errorCode}>
                {t(`api-errors:${error.errorCode}`)}
              </div>
            ))}
          </>
        }
        okText={t("OK")}
        isVisible={isErrorVisible}
        onOk={hideModal}
      />
    </>
  );
};

export { IdComplyModalComponent };
