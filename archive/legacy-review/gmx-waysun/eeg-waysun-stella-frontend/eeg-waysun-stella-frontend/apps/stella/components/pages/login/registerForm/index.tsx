import React, { FC, useEffect, useState } from "react";
import { Modal, Tabs, message } from "ui";
import { RegisterModalFormSection } from "./../index.styled";
import AccountDetailsForm from "../accountDetailsForm";
import ContactDetailsForm from "../contactDetailsForm";
import BillingDetailsForm from "../billingDetailsForm";
import { useTranslation } from "next-export-i18n";
import { useApi } from "../../../../services/api-service";
import { AccountDataType, ContactDataType, BillingDataType, tabs } from "utils";
import { useRouter } from "next/router";

enum registrationRequestApiDetails {
  URL = "ipm/registration",
  METHOD = "POST",
}

enum registrationStatusRequestApiDetails {
  URL = "ipm/result",
  METHOD = "GET",
}

type RegistrationFormProps = {
  showModal: boolean;
  close: () => void;
};

const defaultAccountData: AccountDataType = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const defaultContactData: ContactDataType = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
};

const defaultBillingData: BillingDataType = {
  company_name: "",
  billing_email: "",
  tax_id: "",
  company_reg_no: "",
  country: "",
  address1: "",
  address2: "",
  city: "",
  postal_code: "",
  region: "",
};

const RegistrationForm: FC<RegistrationFormProps> = ({ showModal, close }) => {
  const { t } = useTranslation();
  const router = useRouter();

  //   ----------

  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [currentTab, setCurrentTab] = useState(tabs[currentTabIndex]);
  const [accountData, setAccountData] =
    useState<AccountDataType>(defaultAccountData);
  const [contactData, setContactData] =
    useState<ContactDataType>(defaultContactData);
  const [billingData, setBillingData] =
    useState<BillingDataType>(defaultBillingData);
  const [operationId, setOperationId] = useState("");

  //   ----------

  const registrationRequestApi: {
    data: any;
    triggerApi: any;
    error: any;
    isLoading: boolean;
    resetHookState: any;
    statusOk?: boolean;
  } = useApi(
    registrationRequestApiDetails.URL,
    registrationRequestApiDetails.METHOD,
  );

  const registrationStatusRequestApi: {
    data: any;
    triggerApi: any;
    error: any;
    isLoading: boolean;
    resetHookState: any;
    statusOk?: boolean;
  } = useApi(
    `${registrationStatusRequestApiDetails.URL}/${operationId}`,
    registrationStatusRequestApiDetails.METHOD,
  );

  //   ----------

  useEffect(() => {
    if (
      registrationRequestApi.statusOk &&
      registrationRequestApi.data?.status === "ok"
    ) {
      setOperationId(registrationRequestApi.data.result.operation_id);
    }
  }, [registrationRequestApi.data]);

  useEffect(() => {
    if (
      registrationStatusRequestApi.statusOk &&
      registrationStatusRequestApi.data?.status === "ok"
    ) {
      message.success(t("REGISTRATION_SUCCESS"));
      router.push(
        `/login?realm_id=${registrationStatusRequestApi.data.result.details.realm_id}`,
        undefined,
        { shallow: false },
      );
      resetModalAndClose();
      setOperationId("");
      registrationRequestApi.resetHookState();
      registrationStatusRequestApi.resetHookState();
    }
  }, [registrationStatusRequestApi.data]);

  useEffect(() => {
    if (registrationRequestApi.error || registrationStatusRequestApi.error) {
      message.error(t("Error"));
      registrationRequestApi.resetHookState();
      registrationStatusRequestApi.resetHookState();
    }
  }, [registrationRequestApi.error, registrationStatusRequestApi.error]);

  useEffect(() => {
    if (operationId && operationId.length > 0) {
      registrationStatusRequestApi.triggerApi();
    }
  }, [operationId]);

  //   ----------

  const nextClicked = () => {
    setCurrentTabIndex(currentTabIndex + 1);
    setCurrentTab(tabs[currentTabIndex + 1]);
  };

  const prevClicked = () => {
    setCurrentTabIndex(currentTabIndex - 1);
    setCurrentTab(tabs[currentTabIndex - 1]);
  };

  const resetModalAndClose = () => {
    setCurrentTabIndex(0);
    setCurrentTab(tabs[0]);
    setAccountData(defaultAccountData);
    setContactData(defaultContactData);
    setBillingData(defaultBillingData);
    close();
  };

  const register = () => {
    const payload = {
      master_user: {
        username: accountData.username,
        email: accountData.email,
        password: accountData.password,
      },
      contact_info: contactData,
      billing_info: {
        company_name: billingData.company_name,
        billing_email: billingData.billing_email,
        tax_id: billingData.tax_id,
        company_reg_no: billingData.company_reg_no,
      },
      billing_address: {
        country: billingData.country,
        address1: billingData.address1,
        address2: billingData.address2,
        city: billingData.city,
        postal_code: billingData.postal_code,
        region: billingData.region,
      },
    };
    registrationRequestApi.triggerApi(payload);
  };

  //   ----------

  return (
    <div>
      <Modal
        display={showModal}
        onCloseButtonClicked={resetModalAndClose}
        contentPadding={0}
        scrollable
      >
        <div>
          <Tabs tabs={tabs} selectedTab={currentTab} clickable={false} />
          {showModal && (
            <RegisterModalFormSection>
              {currentTabIndex === 0 && (
                <AccountDetailsForm
                  nextStep={nextClicked}
                  prevStep={resetModalAndClose}
                  data={accountData}
                  saveData={setAccountData}
                />
              )}
              {currentTabIndex === 1 && (
                <ContactDetailsForm
                  nextStep={nextClicked}
                  prevStep={prevClicked}
                  data={contactData}
                  saveData={setContactData}
                />
              )}
              {currentTabIndex === 2 && (
                <BillingDetailsForm
                  nextStep={register}
                  prevStep={prevClicked}
                  data={billingData}
                  saveData={setBillingData}
                  loading={
                    registrationRequestApi.isLoading ||
                    registrationStatusRequestApi.isLoading
                  }
                />
              )}
            </RegisterModalFormSection>
          )}
        </div>
      </Modal>
    </div>
  );
};

//   ----------

export default RegistrationForm;
