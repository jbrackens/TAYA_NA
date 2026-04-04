import React, { useEffect, useContext } from "react";
import { Modal, Button, Input, message } from "ui";
import { useTranslation } from "next-export-i18n";
import { ModalContent, CustomField } from "./../index.style";
import { UserIdContext } from "./../userIdContext";
import { useApi } from "../../../../services/api-service";
import { useFormik } from "formik";
import * as yup from "yup";
import { v4 as uuidv4 } from "uuid";

const TransactionModal = ({
  show,
  close,
  currencies,
  updateWallet,
  currencyId,
  paymentType,
  projectForTransaction,
}) => {
  const { t } = useTranslation();

  const { currentUserId } = useContext(UserIdContext);

  const postTransactions: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
    statusOk?: boolean;
  } = useApi(
    `wallet/admin/${projectForTransaction}/${currentUserId}/transactions`,
    "POST",
  );

  useEffect(() => {
    if (postTransactions.error) {
      message.error(t(postTransactions.error?.payload?.details?.errorCodes[0]));
      postTransactions.resetHookState();
      return;
    }
  }, [postTransactions.error]);

  useEffect(() => {
    if (postTransactions.statusOk) {
      message.success(t("SUCCESS"));
      updateWallet();
      closeTransactionModal();
      formik.resetForm();
    }
  }, [postTransactions.statusOk]);

  const closeTransactionModal = () => {
    close();
    formik.resetForm();
  };

  const formValidationSchema = yup.object().shape({
    value: yup.number().required(t("REQUIRED_ERROR")),
  });

  const submitPayment = (values) => {
    const payload = {
      transferType: paymentType === "TOPUP" ? "topUpFunds" : "withdrawFunds",
      externalTransactionId: uuidv4(),
      title: "Payment via credit card",
      currencyId: currencyId,
      amount: values.value,
    };
    postTransactions.triggerApi(payload);
  };

  const formik = useFormik({
    initialValues: {
      value: "",
    },
    validationSchema: formValidationSchema,
    onSubmit: submitPayment,
  });

  return (
    <Modal
      display={show}
      onCloseButtonClicked={closeTransactionModal}
      modalheader={t(paymentType)}
    >
      <ModalContent>
        <form onSubmit={formik.handleSubmit}>
          <CustomField>
            <Input
              labelText={`${t("ENTER_AMOUNT")} - ${
                currencies.find((currency) => currency.id === currencyId)?.name
              }`}
              id="value"
              name="value"
              type="number"
              onChange={formik.handleChange}
              value={formik.values.value}
              fullWidth
              error={
                formik.errors.value && formik.touched.value
                  ? formik.errors.value
                  : ""
              }
            />
          </CustomField>
          <Button fullWidth type="submit" loading={postTransactions.isLoading}>
            {t(paymentType)}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default TransactionModal;
