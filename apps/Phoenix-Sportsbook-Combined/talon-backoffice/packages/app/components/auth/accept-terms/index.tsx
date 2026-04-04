import React, { useState, ReactNode } from "react";
import { useTranslation } from "i18n";
import { useApi } from "../../../services/api/api-service";
import { useEffect } from "react";
import { Tooltip } from "antd";
import { CoreSpin } from "./../../ui/spin";
import { useDispatch, useSelector } from "react-redux";
import {
  selectTermsModalVisible,
  hideTermsModal,
  showTermsModal,
} from "../../../lib/slices/authSlice";
import {
  InlineCoreButton,
  ContentContainer,
  TermsStyledModal,
} from "./index.styles";
import {
  selectIsUserDataLoading,
  selectUserPersonalDetails,
  setIsAccountDataUpdateNeeded,
} from "../../../lib/slices/settingsSlice";
import { useLogout } from "../../../hooks/useLogout";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";

const SPINNER_DELAY = 500;

type Terms = {
  version: number;
};

const AcceptTermsComponent: React.FC = () => {
  const { t } = useTranslation(["accept-terms"]);
  const getTerms = useApi(`terms`, "GET");
  const putTerms = useApi(`terms/accept`, "PUT");
  const dispatch = useDispatch();
  const { logOutAndRemoveToken } = useLogout();
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isAcceptDisabled, setIsAcceptDisabled] = useState(true);
  const isTermsModalVisible = useSelector(selectTermsModalVisible);
  const userData = useSelector(selectUserPersonalDetails);
  const isLoading = useSelector(selectIsUserDataLoading);
  const [termsContent, setTermsContent] = useState<string>("");
  const [acceptTermsVersion, setAcceptTermsVersion] = useState<Terms>({
    version: 0,
  });

  const onAcceptTerms = () => {
    putTerms.triggerApi(acceptTermsVersion);
  };

  const onLogout = () => {
    logOutAndRemoveToken();
    dispatch(hideTermsModal());
  };

  useEffect(() => {
    if (!isTermsModalVisible) return;
    getTerms.triggerApi();
  }, [isTermsModalVisible]);

  useEffect(() => {
    if (isLoading) return;
    if (!userData.hasToAcceptTerms) return;
    dispatch(showTermsModal());
  }, [userData.hasToAcceptTerms]);

  useEffect(() => {
    const data = getTerms.data;

    if (data) {
      setAcceptTermsVersion({ version: data.version });
      setTermsContent(data.content);
    }
  }, [getTerms.statusOk]);

  useEffect(() => {
    if (putTerms.error) {
      setIsErrorModalVisible(true);
      putTerms.resetHookState();
    }
  }, [putTerms.error]);

  useEffect(() => {
    if (putTerms.statusOk) {
      dispatch(hideTermsModal());
      dispatch(setIsAccountDataUpdateNeeded(true));
    }
  }, [putTerms.statusOk]);

  const onScroll: React.EventHandler<React.UIEvent<ReactNode>> = (
    event: React.UIEvent<React.ReactNode>,
  ) => {
    const target: EventTarget = event.target;
    const targetDiv: HTMLDivElement = target as HTMLDivElement;

    const bottom =
      targetDiv.scrollHeight - targetDiv.scrollTop - targetDiv.clientHeight < 1; // reduced height slightly so user doesn't have to scroll to the exact bottom

    if (bottom) {
      setIsAcceptDisabled(false);
    }
  };

  return (
    <>
      <TermsStyledModal
        visible={isTermsModalVisible}
        title={t("TITLE")}
        closable={false}
        width={1000}
        footer={[
          <>
            <InlineCoreButton type="default" key="logout" onClick={onLogout}>
              {t("LOGOUT")}
            </InlineCoreButton>

            {isAcceptDisabled ? (
              <Tooltip title={t("SCROLL_TO_ACCEPT")}>
                <InlineCoreButton
                  key="accept"
                  type="primary"
                  loading={putTerms.isLoading}
                  onClick={onAcceptTerms}
                  disabled={isAcceptDisabled}
                >
                  {t("ACCEPT_TERMS")}
                </InlineCoreButton>
              </Tooltip>
            ) : (
              <InlineCoreButton
                key="accept"
                type="primary"
                loading={putTerms.isLoading}
                onClick={onAcceptTerms}
                disabled={isAcceptDisabled}
              >
                {t("ACCEPT_TERMS")}
              </InlineCoreButton>
            )}
          </>,
        ]}
      >
        {getTerms.isLoading ? (
          <CoreSpin size="large" delay={SPINNER_DELAY} />
        ) : (
          <>
            <ContentContainer
              onScroll={onScroll as any}
              dangerouslySetInnerHTML={{ __html: termsContent }}
            ></ContentContainer>
          </>
        )}
      </TermsStyledModal>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={t("TITLE_FAIL")}
        onOk={() => setIsErrorModalVisible(false)}
        okText={t("OK")}
        isVisible={isErrorModalVisible}
      />
    </>
  );
};

export { AcceptTermsComponent };
