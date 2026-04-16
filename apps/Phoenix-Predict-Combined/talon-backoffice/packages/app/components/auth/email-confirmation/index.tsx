import React from "react";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { showAuthModal } from "../../../lib/slices/authSlice";
import { useState } from "react";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";

type EmailConfirmationComponentProps = {
  emailToken?: string;
};

const EmailConfirmationComponent: React.FC<EmailConfirmationComponentProps> = ({
  emailToken,
}) => {
  const { t } = useTranslation(["verify-email"]);
  const { error, statusOk, triggerApi } = useApi(
    `account/activate/${emailToken}`,
    "PUT",
  );
  const dispatch = useDispatch();
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const successOnOk = () => {
    dispatch(showAuthModal());
  };

  useEffect(() => {
    if (emailToken !== undefined) {
      triggerApi();
    }
  }, [emailToken]);

  useEffect(() => {
    if (error) {
      setIsErrorModalVisible(true);
    }
  }, [error]);

  return (
    <>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={t("TITLE_FAIL")}
        okText={t("OK")}
        isVisible={isErrorModalVisible}
      />
      <ResultModalComponent
        status={StatusEnum.SUCCESS}
        title={t("TITLE_SUCCESS")}
        subTitle={t("CONTENT_SUCCESS")}
        onOk={successOnOk}
        okText={t("LOGIN")}
        isVisible={!!statusOk}
      />
    </>
  );
};

export { EmailConfirmationComponent };
