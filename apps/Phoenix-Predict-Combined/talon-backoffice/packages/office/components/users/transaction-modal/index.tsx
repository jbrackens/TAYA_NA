import { Button, Form, Input, InputNumber, message, Modal, Radio } from "antd";
import { FC, useState } from "react";
import { useTranslation } from "i18n";
import { Id, Method, useSpy } from "@phoenix-ui/utils";
import { RuleObject } from "rc-field-form/lib/interface";
import { useApi } from "../../../services/api/api-service";
import { isBoolean } from "lodash";
import { useRouter } from "next/router";

enum TransactioTypeEnum {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

enum ActionTypeEnum {
  ADJUSTMENT = "ADJUSTMENT",
  PAYMENT = "PAYMENT",
}

type Props = {
  isTransactionModalVisible: boolean;
  setIsTransactionModalVisbile: React.Dispatch<React.SetStateAction<boolean>>;
  id: Id;
  setDetailsKey: React.Dispatch<React.SetStateAction<number>>;
};

export const TransctionModal: FC<Props> = ({
  isTransactionModalVisible,
  setIsTransactionModalVisbile,
  id,
  setDetailsKey,
}) => {
  const { t } = useTranslation("page-users-details");
  const [transactionForm] = Form.useForm();
  const { spy } = useSpy();

  const [triggerFundsCredit, _loadingFundsCredit, creditResponse] = useApi(
    "admin/punters/:id/funds/credit",
    Method.POST,
  );
  const [triggerFundsDebit, _loadingFundsDebit, debitResponse] = useApi(
    "admin/punters/:id/funds/debit",
    Method.POST,
  );

  const transactionFailed = [!!creditResponse?.error, !!debitResponse?.error];

  const transactionSucceeded = [
    creditResponse?.succeeded,
    debitResponse?.succeeded,
  ];

  spy(transactionFailed, ({ values }) => {
    const failCount = values.filter(
      (e: boolean | undefined) => isBoolean(e) && e,
    ).length;

    if (failCount) {
      if (activityDetails === "walletHistory") {
        setFakeLoading(false);
      }
    }
  });

  const { query } = useRouter();

  const { activityDetails } = query;

  const [fakeLoading, setFakeLoading] = useState(false);

  spy(transactionSucceeded, ({ values }) => {
    const successCount = values.filter(
      (e: boolean | undefined) => isBoolean(e) && e,
    ).length;
    if (successCount) {
      if (activityDetails === "walletHistory") {
        setTimeout(() => {
          setDetailsKey((prev) => prev + 1);
          setFakeLoading(false);
          handleTransactionCancel();
          message.success(t("TRANSACTION_SUCCESS_MESSAGE"));
        }, 3000);
      }
    }
  });

  const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
  };
  const tailLayout = {
    wrapperCol: { offset: 8, span: 16 },
  };

  const handleTransactionCancel = () => {
    setIsTransactionModalVisbile(false);
    transactionForm.resetFields();
  };

  const onTransactionFinish = (values: any) => {
    setFakeLoading(true);
    const debitFunds = async () => {
      try {
        await triggerFundsDebit(
          {
            details: values.reason,
            amount: {
              amount: values.amount,
              currency: "USD",
            },
            ...(values?.reason && {
              reason:
                values.actionType === ActionTypeEnum.ADJUSTMENT
                  ? "ADJUSTMENT"
                  : "WITHDRAWAL",
            }),
          },
          {
            id,
          },
        );
      } catch (err) {
        console.error({ err });
        message.error(`Failed to credit $${values.amount}.`);
        setFakeLoading(false);
        handleTransactionCancel();
      }
    };

    const creditFunds = async () => {
      try {
        await triggerFundsCredit(
          {
            details: values.reason,
            amount: {
              amount: values.amount,
              currency: "USD",
            },
            ...(values?.reason && {
              reason:
                values.actionType === ActionTypeEnum.ADJUSTMENT
                  ? "ADJUSTMENT"
                  : "DEPOSIT",
            }),
          },
          {
            id,
          },
        );
      } catch (err) {
        console.error({ err });
        message.error(`Failed to credit $${values.amount}.`);
        setFakeLoading(false);
        handleTransactionCancel();
      }
    };

    values?.transactionType === TransactioTypeEnum.CREDIT
      ? creditFunds()
      : debitFunds();
  };

  const amountValidation = (
    _rule: RuleObject,
    value: any,
    callback: (error?: string) => void,
  ) => {
    if (value > 0) {
      return callback();
    }
    return callback(t("MIN_AMOUNT_ERROR"));
  };

  return (
    <Modal
      title={t("TRANSACTION_MODAL_TITLE")}
      visible={isTransactionModalVisible}
      onCancel={handleTransactionCancel}
      footer={null}
    >
      <Form
        {...layout}
        form={transactionForm}
        name="basic"
        onFinish={onTransactionFinish}
        initialValues={{
          transactionType: TransactioTypeEnum.CREDIT,
          actionType: ActionTypeEnum.PAYMENT,
        }}
      >
        <Form.Item name="actionType" label={t("ACTION_TYPE")}>
          <Radio.Group>
            <Radio value={ActionTypeEnum.ADJUSTMENT}>
              {t("TRANSACTION_TYPE_ADJUSTMENT")}
            </Radio>
            <Radio value={ActionTypeEnum.PAYMENT}>
              {t("TRANSACTION_TYPE_PAYMENT")}
            </Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="transactionType" label={t("TRANSACTION_TYPE")}>
          <Radio.Group>
            <Radio value={TransactioTypeEnum.CREDIT}>{t("CREDIT")}</Radio>
            <Radio value={TransactioTypeEnum.DEBIT}>{t("DEBIT")}</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="Amount"
          name="amount"
          rules={[
            { required: true, message: "Amount is required" },
            {
              validator: amountValidation,
              message: "Amount must be greater than 0",
            },
          ]}
        >
          <InputNumber />
        </Form.Item>
        <Form.Item
          label={t("REASON")}
          name="reason"
          rules={[{ required: true, message: t("REASON_ERROR") }]}
        >
          <Input />
        </Form.Item>
        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit" loading={fakeLoading}>
            {t("MODAL_CONFIRM")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
