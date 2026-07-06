import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "i18n";
import { CoreModal } from "../../ui/modal";
import { CoreButton } from "../../ui/button";
import { CoreSpin } from "../../ui/spin";
import {
  selectUserPersonalDetails,
  setIsAccountDataUpdateNeeded,
  setUserData,
} from "../../../lib/slices/settingsSlice";
import { useTermsCurrent, useAcceptTerms } from "../../../services/go-api/terms/terms-hooks";

const AcceptTermsComponent: React.FC = () => {
  const { t } = useTranslation(["accept-terms"]);
  const dispatch = useDispatch();
  const { hasToAcceptTerms } = useSelector(selectUserPersonalDetails);
  const { data: terms, isLoading } = useTermsCurrent(hasToAcceptTerms);
  const acceptMutation = useAcceptTerms();

  const handleAccept = () => {
    if (!terms) return;
    acceptMutation.mutate(
      { version: terms.version },
      {
        onSuccess: (response) => {
          dispatch(
            setUserData({
              hasToAcceptTerms: false,
              terms: response.terms
                ? {
                    acceptedAt:
                      response.terms.acceptedAt ?? response.terms.accepted_at,
                    version: response.terms.version,
                  }
                : undefined,
            }),
          );
          dispatch(setIsAccountDataUpdateNeeded(true));
        },
      },
    );
  };

  return (
    <CoreModal
      title={t("TITLE")}
      centered
      visible={hasToAcceptTerms}
      maskClosable={false}
      closable={false}
      footer={null}
    >
      {isLoading ? (
        <CoreSpin spinning />
      ) : (
        <>
          <div
            style={{ maxHeight: 400, overflowY: "auto", marginBottom: 16 }}
            dangerouslySetInnerHTML={{ __html: terms?.content || "" }}
          />
          <CoreButton
            type="primary"
            size="large"
            block
            loading={acceptMutation.isLoading}
            onClick={handleAccept}
          >
            {t("ACCEPT")}
          </CoreButton>
        </>
      )}
    </CoreModal>
  );
};

export { AcceptTermsComponent };
