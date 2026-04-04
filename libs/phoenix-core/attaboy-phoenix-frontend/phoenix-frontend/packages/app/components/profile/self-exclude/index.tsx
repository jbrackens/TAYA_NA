import React, { useEffect, useCallback } from "react";
import { useTranslation } from "i18n";
import { Radio, Row, Col, message } from "antd";
import { RuleObject } from "rc-field-form/lib/interface";
import { useApi } from "../../../services/api/api-service";
import {
  CardWithBorderBottom,
  BreakButton,
  MarginLeftRightContainer,
  SubTitle,
} from "./index.styled";
import { useState } from "react";
import { MfaModalComponent } from "../../auth/mfa-modal";
import { useRouter } from "next/router";
import { setIsAccountDataUpdateNeeded } from "../../../lib/slices/settingsSlice";
import { useDispatch } from "react-redux";
import { ErrorComponent } from "../../errors";
import { useLogout } from "../../../hooks/useLogout";
import { CoreForm } from "../../ui/form";
import { CoreCheckbox } from "../../ui/checkbox";

const TOTAL_TERMS = 4;

type FormValues = {
  duration: string;
};

enum SelfExclusionDuration {
  ONE_YEAR = "ONE_YEAR",
  FIVE_YEARS = "FIVE_YEARS",
}

const SelfExcludeComponent: React.FC = () => {
  const { t } = useTranslation(["self-exclude"]);
  const [formValues, setFormValues] = useState<FormValues>({} as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const [isMfaCodeModalVisible, setMfaCodeModalVisible] = useState(false);
  const [isVerificationSuccess, setVerificationSuccess] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const selfExcludeApi = useApi(`punters/self-exclude`, "POST");
  const { logOutWithoutApiCall } = useLogout();
  const [requestErrors, setRequestErrors] = useState<
    Array<{ errorCode: string }>
  >();

  const [form] = CoreForm.useForm();

  const toggleMfaCallback = (code: string, id?: string): void => {
    if (formFinished) {
      const proceedSubmitRequest = async () => {
        const { duration } = formValues;

        selfExcludeApi.triggerApi(
          {
            duration,
            verificationId: id,
            verificationCode: code,
          },
          undefined,
        );
      };
      proceedSubmitRequest();
      setFormFinished(false);
    }
  };

  useEffect(() => {
    if (!selfExcludeApi.statusOk) {
      setRequestErrors(selfExcludeApi.error?.payload?.errors);
      return;
    }

    setRequestErrors([]);

    setVerificationSuccess(true);
    setMfaCodeModalVisible(false);
    dispatch(setIsAccountDataUpdateNeeded(true));
    logOutWithoutApiCall();
    router.replace("/esports-bets");
    message.info(t("SELF_EXCLUSION_STARTED"));
    form.resetFields();
  }, [selfExcludeApi.statusOk]);

  useEffect(() => {
    if (requestErrors && !isMfaCodeModalVisible) {
      setRequestErrors([]);
    }
  }, [isMfaCodeModalVisible]);

  const onFinish = useCallback(() => {
    setFormValues(form.getFieldsValue(true));
    setFormFinished(true);
    setMfaCodeModalVisible(true);
  }, [form]);

  const cancelMfa = (): void => {
    setMfaCodeModalVisible(false);
  };

  const termsValidation = (
    _rule: RuleObject,
    value: any,
    callback: (error?: string) => void,
  ) => {
    if (value.length === TOTAL_TERMS) {
      return callback();
    }
    return callback(t("TERMS_ERROR"));
  };

  return (
    <>
      <MarginLeftRightContainer>
        <CardWithBorderBottom bordered={false}>
          <CoreForm
            name="selfExcludeForm"
            onFinish={onFinish}
            form={form}
            colon={false}
            requiredMark={true}
            initialValues={{
              terms: [],
            }}
          >
            <CoreForm.Item
              name="terms"
              rules={[
                { validator: termsValidation, message: t("TERMS_ERROR") },
              ]}
            >
              <CoreCheckbox.Group>
                <SubTitle>{t("SUBTITLE1")}</SubTitle>

                <Row wrap={false} gutter={[10, 10]}>
                  <Col flex="none">
                    <CoreCheckbox value={1}></CoreCheckbox>
                  </Col>
                  <Col flex="auto">
                    <p>
                      I hereby release and forever discharge the State of New
                      Jersey, the Division of Gaming Enforcement and its
                      employees and agents, and all New Jersey Internet gaming
                      licensed permit holders from any liability to me and my
                      heirs, administrators, executors, and assigns, for any
                      harm, monetary or otherwise, which may arise out of or by
                      reason of any act or omission relating to this Request for
                      Self-Exclusion from Internet Gaming activities, or my
                      request for removal from the Self-Exclusion List for
                      Internet Gaming activities including: 1) its processing or
                      enforcement; 2) the failure of a New Jersey Internet
                      gaming licensed permit holder to withhold gaming
                      privileges from, or to restore gaming privileges to me; 3)
                      permitting me to engage in gaming activity on sites of
                      Internet gaming license permit holders while on the list
                      of self-excluded persons; and 4) disclosure of the
                      information contained in the self-exclusion request or
                      list, except for a willfully-unlawful disclosure of such
                      information.
                    </p>
                  </Col>
                </Row>

                <SubTitle>{t("SUBTITLE2")}</SubTitle>

                <Row wrap={false} gutter={[10, 10]}>
                  <Col flex="none">
                    <CoreCheckbox value={2}></CoreCheckbox>
                  </Col>
                  <Col flex="auto">
                    <p>
                      I am voluntarily requesting exclusion from all New Jersey
                      Internet gaming because I am a problem Internet gambler. I
                      certify that the information I have provided Is true and
                      accurate, and that I have read and understand and agree to
                      the waiver and release included with this request for
                      Internet self-exclusion. I am aware that my digital
                      signature authorizes the Division of Gaming Enforcement to
                      direct all New Jersey casino licensees to restrict my
                      Internet gaming in accordance with this request and,
                      unless I have requested in person to be excluded for life,
                      until such time as the Division removes my name from the
                      Internet self-exclusion list in response to my request to
                      terminate my voluntary Internet self-exclusion. You cannot
                      request the removal of your name from the Internet Gaming
                      Self-Exclusion List until one year or five years,
                      respectively, have elapsed from the date you submitted
                      your Request Form. Additionally, your name will continue
                      to remain on the Internet self-Exclusion List until you
                      request its removal. A request for the removal of your
                      name from the Internet Gaming Self-Exclusion List must be
                      done in person at the Division Offices (only). I am aware
                      and agree that during any period of Internet
                      self-exclusion any money or thing of value seized from me,
                      or owed to me by, a casino licensee shall be subject to
                      forfeiture.
                    </p>
                  </Col>
                </Row>

                <Row wrap={false} gutter={[10, 10]}>
                  <Col flex="none">
                    <CoreCheckbox value={3}></CoreCheckbox>
                  </Col>
                  <Col flex="auto">
                    <p>
                      I acknowledge the fact that casino companies might enact
                      responsible gaming programs that are stricter than New
                      Jersey's Self-Exclusion program for Internet gaming. By
                      way of example, a casino may enact a more restrictive
                      responsible gaming program in which persons signing up for
                      state self-exclusion lists are banned from all of their
                      casino properties worldwide for the length of the state
                      self-exclusion terms. A casino ban may include its gaming,
                      hotel and entertainment venues. Current policies may
                      automatically remove a person from Its worldwide ban upon
                      being notified of that person's removal from a state
                      self-exclusion list. The terms and existence of any such
                      responsible gaming program could change, and the Division
                      is not responsible for keeping you Informed of such
                      changes.
                    </p>
                  </Col>
                </Row>

                <Row wrap={false} gutter={[10, 10]}>
                  <Col flex="none">
                    <CoreCheckbox value={4}></CoreCheckbox>
                  </Col>
                  <Col flex="auto">
                    <p>
                      I acknowledge that it may take up to 7 days In order for
                      the self-exclusion to take effect on all state approved
                      Internet gaming permit holder sites.
                    </p>
                  </Col>
                </Row>
              </CoreCheckbox.Group>
            </CoreForm.Item>

            <SubTitle>{t("SUBTITLE3")}</SubTitle>

            <CoreForm.Item
              name="duration"
              rules={[
                {
                  required: true,
                  message: t("DURATION_ERROR"),
                },
              ]}
            >
              <Radio.Group>
                <Radio value={SelfExclusionDuration.ONE_YEAR}>
                  {t(SelfExclusionDuration.ONE_YEAR)}
                </Radio>
                <Radio value={SelfExclusionDuration.FIVE_YEARS}>
                  {t(SelfExclusionDuration.FIVE_YEARS)}
                </Radio>
              </Radio.Group>
            </CoreForm.Item>

            {selfExcludeApi.error && (
              <Row
                justify="center"
                align="middle"
                gutter={[32, 32]}
                role="error"
              >
                <Col span={24}>
                  <ErrorComponent
                    errors={selfExcludeApi.error.payload?.errors}
                    translationKey={"api-errors"}
                  />
                </Col>
              </Row>
            )}

            <Row gutter={[24, 0]}>
              <Col
                xxl={{ span: 6 }}
                xl={{ span: 8 }}
                md={{ span: 8 }}
                sm={{ span: 24 }}
              >
                <CoreForm.Item>
                  <BreakButton
                    htmlType="submit"
                    size="large"
                    loading={selfExcludeApi.isLoading}
                    block
                    danger
                  >
                    {t("SELF_EXCLUDE_BUTTON")}
                  </BreakButton>
                </CoreForm.Item>
              </Col>
            </Row>
          </CoreForm>

          <p>
            For the complete rules governing the Internet Gaming Self-Exclusion
            program, see the Casino Control Act at N.J.S.A 5:12-71.2 and 71.3,
            as well as the regulations set forth at N.J.A.C. 13:69G-2.1 through
            2.5. Copies of these rules are available on the Division's website
            at www.njdge.org, Rules may be changed without prior notice to
            Self-Exclusion program participants.
          </p>
        </CardWithBorderBottom>
      </MarginLeftRightContainer>

      <MfaModalComponent
        showModal={isMfaCodeModalVisible}
        onRequestWithVerification={toggleMfaCallback}
        onCancelVerification={cancelMfa}
        requestCode={true}
        verificationSuccess={isVerificationSuccess}
        requestErrors={requestErrors}
      />
    </>
  );
};

export { SelfExcludeComponent };
