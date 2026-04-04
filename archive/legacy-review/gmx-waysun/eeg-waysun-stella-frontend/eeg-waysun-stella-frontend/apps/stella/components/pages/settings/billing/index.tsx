import React, { FC, useEffect, useState } from "react";
import { SettingsContent } from "./../index.styled";
import DisplayBilling from "./display";
import EditBilling from "./edit";
import { useTranslation } from "next-export-i18n";
import { useApi } from "../../../../services/api-service";
import { SettingsPagesBillingProps, status } from "utils";
import { isEqual } from "lodash";
import { message } from "ui";

const Billing: FC<SettingsPagesBillingProps> = ({ data, onChangeData }) => {
  const { t } = useTranslation();

  const [displayEditMode, setDisplayEditMode] = useState(false);
  const [operationId, setOperationId] = useState("");

  const getBilling: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    "ipm/billing_info",
    "GET",
    "https://16a45b03-003e-4b14-9d11-4af34eed72d1.mock.pstmn.io",
  );

  const putBilling: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    "ipm/billing_info",
    "PUT",
    "https://16a45b03-003e-4b14-9d11-4af34eed72d1.mock.pstmn.io",
  );

  const checkBilling: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `ipm/result/${operationId}`,
    "GET",
    "https://16a45b03-003e-4b14-9d11-4af34eed72d1.mock.pstmn.io",
  );

  useEffect(() => {
    if (data?.first_name) return;
    getBilling.triggerApi();
  }, []);

  useEffect(() => {
    if (!getBilling.data) return;
    if (getBilling.data?.status !== status.OK) return;

    onChangeData({
      ...getBilling.data.result.contact_info,
      ...getBilling.data.result.billing_info,
      ...getBilling.data.result.billing_address,
    });
  }, [getBilling.data]);

  useEffect(() => {
    if (!putBilling.data) return;
    if (putBilling.data?.status !== status.OK) return;

    if (putBilling.data.result.status === status.PROCESSING) {
      setOperationId(putBilling.data.result.operation_id);
    }
  }, [putBilling.data]);

  useEffect(() => {
    if (!checkBilling.data) return;
    if (checkBilling.data?.status !== status.OK) return;

    if (checkBilling.data.result.status === status.DONE) {
      setDisplayEditMode(false);
      message.success(t("BILLING_CHANGE_SUCCESS"));
      onChangeData({
        ...checkBilling.data?.result?.details?.contact_info,
        ...checkBilling.data?.result?.details?.billing_info,
        ...checkBilling.data?.result?.details?.billing_address,
      });
    }
  }, [checkBilling.data]);

  useEffect(() => {
    if (operationId.length <= 0) return;
    checkBilling.triggerApi();
  }, [operationId]);

  useEffect(() => {
    if (getBilling.error || putBilling.error || checkBilling.error) {
      message.error(t("BILLING_ERROR"));
    }
  }, [getBilling.error, putBilling.error, checkBilling.error]);

  const submitBillingInfo = (values) => {
    if (isEqual(data, values)) {
      message.info(t("NO_CHANGE_ERROR"));
    } else {
      const payload = {
        contact_info: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone_number: values.phone_number,
        },
        billing_info: {
          company_name: values.company_name,
          billing_email: values.billing_email,
          tax_id: values.tax_id,
          company_reg_no: values.company_reg_no,
        },
        billing_address: {
          country: values.country,
          address1: values.address1,
          address2: values.address2,
          city: values.city,
          postal_code: values.postal_code,
          region: values.region,
        },
      };
      putBilling.triggerApi(payload);
    }
  };

  return (
    <SettingsContent $customWidth={displayEditMode ? 600 : 450}>
      {displayEditMode ? (
        <EditBilling
          data={data}
          onBackClick={() => {
            setDisplayEditMode(false);
          }}
          loading={putBilling.isLoading || checkBilling.isLoading}
          onSubmit={submitBillingInfo}
        />
      ) : (
        <DisplayBilling
          data={data}
          loading={getBilling.isLoading}
          onButtonClick={() => {
            setDisplayEditMode(true);
          }}
        />
      )}
    </SettingsContent>
  );
};

export default Billing;
