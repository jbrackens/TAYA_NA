import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { defaultNamespaces } from "../defaults";
import { Tabs, Row, Col } from "antd";
import { StyledTabs, StyledDivider, StyledButton } from "./index.styled";
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
import { useDeposit, useWithdraw } from "../../../services/go-api";
import type { AppError } from "../../../services/go-api";

const { TabPane } = Tabs;

type FormValues = {
  amount: string | undefined;
  direction: string | undefined;
};

function Cashier() {
  const { t } = useTranslation(["cashier"]);
  const router = useRouter();
  const depositMutation = useDeposit();
  const withdrawMutation = useWithdraw();
  const [depositForm] = CoreForm.useForm();
  const [withdrawalForm] = CoreForm.useForm();
  const [cashWithdrawal, setCashWithdrawal] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const { tab } = router.query as { tab?: string };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const onFinish = (values: FormValues): void => {
    depositMutation.reset();
    withdrawMutation.reset();

    const amount = parseFloat(values.amount || "0");

    if (values.direction === "deposit") {
      depositMutation.mutate(
        {
          amount,
          currency: "USD",
          // TODO: payment_method and payment_token will be needed once
          // Go backend has phoenix-payments with payment gateway integration.
          // For now, Go wallet accepts direct deposits.
          payment_method: "direct",
          payment_token: "",
        },
        {
          onSuccess: () => {
            // Go deposit is processed directly — no payment gateway redirect.
            // Old flow redirected to payment provider; this will change with phoenix-payments.
            router.push(
              `/cashier/transaction?txStatus=SUCCEEDED&txDirection=Deposit`,
            );
          },
        },
      );
    }

    if (values.direction === "withdrawal") {
      withdrawMutation.mutate(
        {
          amount,
          currency: "USD",
          // TODO: bank_account_id will be collected from a form or saved payment methods
          // once Go backend has phoenix-payments. For now, Go wallet processes directly.
          bank_account_id: cashWithdrawal ? "cash" : "cheque",
        },
        {
          onSuccess: (data) => {
            if (cashWithdrawal) {
              router.push(
                `/cashier/transaction?txStatus=SUCCEEDED&txDirection=Withdrawal&txAdditionalMessage=CASH_WITHDRAWAL_EXTRA_MESSAGE&txId=${data.withdrawal_id}`,
              );
            } else {
              router.push(`/cashier/transaction/cheque`);
            }
          },
        },
      );
    }
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
    if (depositMutation.error) {
      depositMutation.reset();
    }
  };

  const removeWithdrawalErrorOnValueChange = () => {
    if (withdrawMutation.error) {
      withdrawMutation.reset();
    }
  };

  const depositError = depositMutation.error as AppError | undefined;
  const withdrawError = withdrawMutation.error as AppError | undefined;
  const isDepositLoading = depositMutation.isLoading;
  const isWithdrawLoading = withdrawMutation.isLoading;

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

                {depositError && (
                  <Row
                    justify="center"
                    align="middle"
                    gutter={[32, 32]}
                    role="error"
                  >
                    <Col span={24}>
                      <ErrorComponent
                        errors={depositError.payload?.errors}
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
                    loading={isDepositLoading}
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
                {withdrawError && (
                  <Row
                    justify="center"
                    align="middle"
                    gutter={[32, 32]}
                    role="error"
                  >
                    <Col span={24}>
                      <ErrorComponent
                        errors={withdrawError.payload?.errors}
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
                    loading={isWithdrawLoading && !cashWithdrawal}
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
                    loading={isWithdrawLoading && cashWithdrawal}
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
