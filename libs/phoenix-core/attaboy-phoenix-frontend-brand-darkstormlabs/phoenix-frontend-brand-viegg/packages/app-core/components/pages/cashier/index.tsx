import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { defaultNamespaces } from "../defaults";
import { Tabs, Row, Col } from "antd";
import { StyledTabs, StyledDivider, StyledButton } from "./index.styled";
import { useApi } from "../../../services/api/api-service";
import { useTranslation } from "i18n";
import { ErrorComponent } from "../../errors";
import { RuleObject } from "rc-field-form/lib/interface";
import { CoreForm } from "../../ui/form";
import { InputsContainer } from "../../ui/form/index.styled";
import { CoreInput } from "../../ui/input";
import { CoreInputNumber } from "../../ui/inputNumber";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { useSelector } from "react-redux";
import {
  selectMaxDepositValue,
  selectMaxWithdrawalValue,
  selectMinDepositValue,
  selectMinWithdrawalValue,
} from "../../../lib/slices/siteSettingsSlice";

const { TabPane } = Tabs;

type FormValues = {
  amount: string | undefined;
  direction: string | undefined;
};

function Cashier() {
  const { t } = useTranslation(["cashier"]);
  const router = useRouter();
  const useDeposit = useApi("payments/deposit", "POST");
  const useWithdrawal = useApi("payments/cheque-withdrawal", "POST");
  const useCashWithdrawal = useApi("payments/cash-withdrawal", "POST");
  const [depositForm] = CoreForm.useForm();
  const [withdrawalForm] = CoreForm.useForm();
  const [formValues, setFormValue] = useState<FormValues>({
    amount: undefined,
  } as FormValues);
  const [formFinished, setFormFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { tab } = router.query as {
    tab?: string;
  };
  const [cashWithdrawal, setCashWithdrawal] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const { amount, direction } = formValues;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!formFinished) return;

    if (direction === "deposit") {
      useDeposit.triggerApi({
        amount: { amount: amount, currency: "USD" },
      });
    }
    if (direction === "withdrawal" && !cashWithdrawal) {
      useWithdrawal.triggerApi({
        amount: { amount: amount, currency: "USD" },
      });
    }

    if (direction === "withdrawal" && cashWithdrawal) {
      useCashWithdrawal.triggerApi({
        amount: { amount: amount, currency: "USD" },
      });
    }

    setFormFinished(false);
  }, [formFinished]);

  useEffect(() => {
    if (!useDeposit.statusOk) return;
    const data = useDeposit.data;
    window.location.assign(
      `${data.redirectUrl}?requestData=${data.paymentReference}`,
    );
  }, [useDeposit.statusOk]);

  useEffect(() => {
    if (!useWithdrawal.statusOk) return;
    window.location.assign(`/cashier/transaction/cheque`);
  }, [useWithdrawal.statusOk]);

  useEffect(() => {
    if (!useDeposit.error) return;
    setIsLoading(false);
  }, [useDeposit.error]);

  useEffect(() => {
    if (!useWithdrawal.error) return;
    setIsLoading(false);
  }, [useWithdrawal.error]);

  useEffect(() => {
    if (!useCashWithdrawal.error) return;
    setIsLoading(false);
  }, [useCashWithdrawal.error]);

  useEffect(() => {
    if (!useCashWithdrawal.statusOk) return;
    const data = useCashWithdrawal.data;
    window.location.assign(
      `/cashier/transaction?txStatus=SUCCEEDED&txDirection=Withdrawal&txAdditionalMessage=CASH_WITHDRAWAL_EXTRA_MESSAGE&txId=${data.identifier}`,
    );
  }, [useCashWithdrawal.statusOk]);

  const onFinish = (values: any): void => {
    useDeposit.resetHookState();
    useWithdrawal.resetHookState();
    useCashWithdrawal.resetHookState();
    setIsLoading(true);
    setFormValue(values);
    setFormFinished(true);
  };

  const minDepositValue = useSelector(selectMinDepositValue);
  const maxDepositValue = useSelector(selectMaxDepositValue);

  const depositAmountValidation = (
    _rule: RuleObject,
    value: any,
    callback: (error?: string) => void,
  ) => {
    if (value && value < minDepositValue) {
      return callback(t("MIN_AMOUNT_ERROR", { amount: minDepositValue }));
    }
    if (value && value > maxDepositValue) {
      return callback(t("MAX_AMOUNT_ERROR", { amount: maxDepositValue }));
    }
    return callback();
  };

  const minWithdrawalValue = useSelector(selectMinWithdrawalValue);
  const maxWithdrawalValue = useSelector(selectMaxWithdrawalValue);

  const withdrawAmountValidation = (
    _rule: RuleObject,
    value: any,
    callback: (error?: string) => void,
  ) => {
    if (value && value < minWithdrawalValue) {
      return callback(
        t("WITHDRAWAL_MIN_AMOUNT_ERROR", { amount: minWithdrawalValue }),
      );
    }
    if (value && value > maxWithdrawalValue) {
      return callback(
        t("WITHDRAWAL_MAX_AMOUNT_ERROR", { amount: maxWithdrawalValue }),
      );
    }
    return callback();
  };

  const removeDepositErrorOnValueChange = () => {
    if (useDeposit.error) {
      useDeposit.resetHookState();
    }
  };

  const removeWithdrawalErrorOnValueChange = () => {
    if (useWithdrawal.error) {
      useWithdrawal.resetHookState();
    }
    if (useCashWithdrawal.error) {
      useCashWithdrawal.resetHookState();
    }
  };

  return (
    <>
      {// to fix issue related to inputNumber https://github.com/ant-design/ant-design/issues/30634
      mounted && (
        <>
          <StyledTabs defaultActiveKey={tab}>
            <TabPane tab="Deposit" key="Deposit">
              <CoreForm
                name="depositForm"
                onFinish={onFinish}
                form={depositForm}
                onValuesChange={removeDepositErrorOnValueChange}
              >
                <InputsContainer>
                  <CoreForm.Item
                    name="direction"
                    hidden={true}
                    initialValue="deposit"
                  >
                    <CoreInput />
                  </CoreForm.Item>
                  <CoreForm.Item
                    label={t("DEPOSIT_AMOUNT")}
                    name="amount"
                    rules={[
                      {
                        required: true,
                        message: t("DEPOSIT_AMOUNT_REQUIRED"),
                      },
                      {
                        validator: depositAmountValidation,
                      },
                    ]}
                  >
                    <CoreInputNumber />
                  </CoreForm.Item>
                </InputsContainer>

                {useDeposit.error && (
                  <Row
                    justify="center"
                    align="middle"
                    gutter={[32, 32]}
                    role="error"
                  >
                    <Col span={24}>
                      <ErrorComponent
                        errors={useDeposit.error.payload?.errors}
                        translationKey={"api-errors"}
                      />
                    </Col>
                  </Row>
                )}

                <CoreForm.Item>
                  <StyledButton
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isLoading}
                    block
                  >
                    {t("DEPOSIT_BUTTON")}
                  </StyledButton>
                </CoreForm.Item>

                <StyledDivider>{t("OR")}</StyledDivider>

                <CoreForm.Item>
                  <StyledButton
                    type="primary"
                    size="large"
                    block
                    onClick={() => setIsInfoModalVisible(true)}
                  >
                    {t("DEPOSIT_AT_BALLYS_CAGE_BUTTON")}
                  </StyledButton>
                </CoreForm.Item>
              </CoreForm>
            </TabPane>

            <TabPane tab="Withdrawal" key="Withdrawal">
              <CoreForm
                name="withdrawalForm"
                onFinish={onFinish}
                form={withdrawalForm}
                onValuesChange={removeWithdrawalErrorOnValueChange}
              >
                <InputsContainer>
                  <CoreForm.Item
                    name="direction"
                    hidden={true}
                    initialValue="withdrawal"
                  >
                    <CoreInput />
                  </CoreForm.Item>
                  <CoreForm.Item
                    label={t("WITHDRAWAL_AMOUNT")}
                    name="amount"
                    rules={[
                      {
                        required: true,
                        message: t("WITHDRAWAL_AMOUNT_REQUIRED"),
                      },
                      {
                        validator: withdrawAmountValidation,
                      },
                    ]}
                  >
                    <CoreInputNumber />
                  </CoreForm.Item>
                </InputsContainer>
                {useWithdrawal.error && (
                  <Row
                    justify="center"
                    align="middle"
                    gutter={[32, 32]}
                    role="error"
                  >
                    <Col span={24}>
                      <ErrorComponent
                        errors={useWithdrawal.error.payload?.errors}
                        translationKey={"api-errors"}
                      />
                    </Col>
                  </Row>
                )}

                {useCashWithdrawal.error && (
                  <Row
                    justify="center"
                    align="middle"
                    gutter={[32, 32]}
                    role="error"
                  >
                    <Col span={24}>
                      <ErrorComponent
                        errors={useCashWithdrawal.error.payload?.errors}
                        translationKey={"api-errors"}
                      />
                    </Col>
                  </Row>
                )}

                <CoreForm.Item>
                  <StyledButton
                    type="primary"
                    htmlType="submit"
                    onClick={() => setCashWithdrawal(false)}
                    size="large"
                    loading={isLoading && !cashWithdrawal}
                    block
                  >
                    {t("WITHDRAWAL_BUTTON")}
                  </StyledButton>
                </CoreForm.Item>

                <StyledDivider>{t("OR")}</StyledDivider>

                <CoreForm.Item>
                  <StyledButton
                    type="primary"
                    htmlType="submit"
                    onClick={() => setCashWithdrawal(true)}
                    size="large"
                    loading={isLoading && cashWithdrawal}
                    block
                  >
                    {t("WITHDRAWAL_CASH_BUTTON")}
                  </StyledButton>
                </CoreForm.Item>
              </CoreForm>
            </TabPane>
          </StyledTabs>
          <ResultModalComponent
            status={StatusEnum.INFO}
            subTitle={t("AC_CAGE_DEPOSIT_MESSAGE")}
            onOk={() => setIsInfoModalVisible(false)}
            okText={t("OK")}
            isVisible={isInfoModalVisible}
          />
        </>
      )}
    </>
  );
}

Cashier.namespacesRequired = [...defaultNamespaces, "cashier"];

export default Cashier;
