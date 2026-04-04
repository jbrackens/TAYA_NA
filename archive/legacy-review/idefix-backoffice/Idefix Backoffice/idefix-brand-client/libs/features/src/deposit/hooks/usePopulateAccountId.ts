import * as React from "react";
import { useFormikContext } from "formik";
import { useDeposit } from "../context";

function usePopulateAccountId() {
  const {
    selectedDepositMethod: { type, account }
  } = useDeposit();
  const { setFieldValue, validateForm } = useFormikContext();

  React.useEffect(() => {
    validateForm();

    if (type === "neteller" && !!account) {
      setFieldValue("accountId", account);
    }
  }, [type, account, setFieldValue, validateForm]);
}

export { usePopulateAccountId };
