import React, { useState } from "react";
import { Col, Row } from "antd";
import { useTranslation } from "i18n";
import { StyledCard, TermsContainer, ErrorContainer } from "./index.styled";
import { useApi } from "../../../services/api/api-service";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setIsAccountDataUpdateNeeded } from "../../../lib/slices/settingsSlice";
import { AddressFormItems } from "./address-form-items";
import { DeletionModalComponent } from "./deletion-modal";
import { isValidPhoneNumber } from "libphonenumber-js";
import { InfoRowComponent } from "./info-row";
import { ChangeEmailModal } from "./change-email";
import { CoreButton } from "../../ui/button";
import { CoreModal } from "../../ui/modal";
import { CoreForm } from "../../ui/form";
import { CoreInput } from "../../ui/input";
import { CoreCheckbox } from "../../ui/checkbox";
import { CoreAlert } from "../../ui/alert";
import { useTimezone } from "@phoenix-ui/utils";

type PersonalDetailsComponentProps = {
  username: string;
  phoneNumber: string;
  email: string;
  name: {
    firstName: string;
    lastName: string;
    title: string;
  };
  address: {
    country: string;
    addressLine: string;
    city: string;
    state: string;
    zipcode: string;
  };
  dateOfBirth: {
    day: number;
    month: number;
    year: number;
  };
  terms:
    | {
        acceptedAt: string;
        version: number;
      }
    | undefined;
  hasToAcceptTerms: boolean;
  signUpDate: string | undefined;
};

export enum ModalTypeEnum {
  CHANGE_EMAIL = "CHANGE_EMAIL",
  CHANGE_PHONE = "CHANGE_PHONE",
  CHANGE_ADDRESS = "CHANGE_ADDRESS",
}

const PersonalDetailsComponent: React.FC<PersonalDetailsComponentProps> = ({
  username,
  email,
  name,
  address,
  dateOfBirth,
  phoneNumber,
  terms,
  hasToAcceptTerms,
  signUpDate,
}) => {
  const { t } = useTranslation(["personal-details", "register"]);
  const [currentModal, setCurrentModal] = useState<ModalTypeEnum | null>(null);
  const [termsToAcceptVersion, setTermsToAcceptVersion] = useState<
    number | null
  >(null);
  const dispatch = useDispatch();
  const { getTimeWithTimezone } = useTimezone();
  const [isDeletionModalVisible, setIsDeletionModalVisible] = useState(false);
  const [isChangeEmailModalVisible, setIsChangeEmailModalVisible] = useState(
    false,
  );
  const { isLoading, triggerApi, error, statusOk, resetHookState } = useApi(
    "profile/details",
    "PUT",
  );
  const getTerms = useApi(`terms`, "GET");
  const [form] = CoreForm.useForm();

  useEffect(() => {
    if (hasToAcceptTerms) {
      getTerms.triggerApi();
    }
  }, [hasToAcceptTerms]);

  useEffect(() => {
    if (getTerms.data) {
      setTermsToAcceptVersion(getTerms.data?.version);
    }
  }, [getTerms.data]);

  const closeModal = () => {
    setCurrentModal(null);
    resetHookState();
  };

  useEffect(() => {
    if (currentModal === null) {
      form.resetFields();
    }
  }, [currentModal]);

  const generateFormItems = () => {
    switch (currentModal) {
      case ModalTypeEnum.CHANGE_ADDRESS:
        return <AddressFormItems form={form} />;
      case ModalTypeEnum.CHANGE_EMAIL:
        return (
          <>
            <CoreForm.Item
              label={t("EMAIL")}
              name="email"
              validateTrigger="onBlur"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: t("register:EMAIL_ERROR"),
                },
              ]}
            >
              <CoreInput
                onBlur={(value) => {
                  form.setFieldsValue({
                    email: value.currentTarget.value.trim(),
                  });
                }}
              />
            </CoreForm.Item>
          </>
        );
      case ModalTypeEnum.CHANGE_PHONE:
        return (
          <>
            <CoreForm.Item
              label={t("register:MOBILE")}
              name="phoneNumber"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_rule) {
                    if (
                      getFieldValue("phoneNumber") !== undefined &&
                      getFieldValue("phoneNumber") !== "" &&
                      !isValidPhoneNumber(getFieldValue("phoneNumber"))
                    ) {
                      return Promise.reject(t("register:MOBILE_ERROR2"));
                    }
                    return Promise.resolve();
                  },
                }),
                ({ getFieldValue }) => ({
                  validator(_rule) {
                    if (
                      getFieldValue("phoneNumber") !== undefined &&
                      getFieldValue("phoneNumber") !== ""
                    ) {
                      return Promise.resolve();
                    }
                    return Promise.reject(t("register:MOBILE_ERROR"));
                  },
                }),
              ]}
            >
              <CoreInput type="phone" />
            </CoreForm.Item>
          </>
        );
    }
  };

  const onFinish = (values: { address?: PersonalDetailsComponentProps["address"]; phoneNumber?: string }) => {
    triggerApi({
      name: name,
      address:
        currentModal === ModalTypeEnum.CHANGE_ADDRESS
          ? values.address
          : address,
      dateOfBirth: dateOfBirth,
      phoneNumber:
        currentModal === ModalTypeEnum.CHANGE_PHONE
          ? values.phoneNumber
          : phoneNumber,
    });
  };

  useEffect(() => {
    if (statusOk) {
      dispatch(setIsAccountDataUpdateNeeded(true));
      setCurrentModal(null);
    }
  }, [statusOk]);

  const renderTerms = () => {
    return (
      <TermsContainer>
        <CoreCheckbox checked={hasToAcceptTerms ? false : true}>
          {hasToAcceptTerms ? t("NOT_ACCEPTED") : t("ACCEPTED")}
        </CoreCheckbox>
        {terms !== undefined ? (
          <span>
            {getTimeWithTimezone(terms.acceptedAt).format("lll")},{" "}
            {t("VERSION")} {terms.version}
          </span>
        ) : (
          <span>
            {t("VERSION")} {termsToAcceptVersion || 0}
          </span>
        )}
      </TermsContainer>
    );
  };

  return (
    <>
      <StyledCard title={t("PERSONAL_DETAILS")}>
        <InfoRowComponent
          name={t("USERNAME")}
          value={<span role={"username"}>{username}</span>}
        />

        <InfoRowComponent
          name={t("REGISTRATION_DATE")}
          value={
            <span role={"registrationDate"}>
              {getTimeWithTimezone(signUpDate).format("lll")}
            </span>
          }
        />

        <InfoRowComponent
          name={t("NAME")}
          value={
            <span role={"name"}>
              {name.firstName} {name.lastName}
            </span>
          }
        />

        <InfoRowComponent
          name={t("EMAIL")}
          value={<span role={"email"}>{email}</span>}
          change={
            <span
              onClick={() => setIsChangeEmailModalVisible(true)}
              role={`${ModalTypeEnum.CHANGE_EMAIL}`}
            >
              {t("CHANGE")}
            </span>
          }
        />

        <InfoRowComponent
          name={t("DATE_OF_BIRTH")}
          value={
            <span role={"dob"}>
              {getTimeWithTimezone(
                `${dateOfBirth.year}-${dateOfBirth.month}-${dateOfBirth.day}`,
              ).format("ll")}
            </span>
          }
        />

        <InfoRowComponent
          name={t("PHONE")}
          value={<span role={"phone"}>{phoneNumber}</span>}
          change={
            <span
              onClick={() => setCurrentModal(ModalTypeEnum.CHANGE_PHONE)}
              role={`${ModalTypeEnum.CHANGE_PHONE}`}
            >
              {t("CHANGE")}
            </span>
          }
          //button={<StyledButton>{t("VERIFY_NUMBER")}</StyledButton>}
        />

        <InfoRowComponent
          name={t("ADDRESS")}
          value={
            <span role={"address"}>
              {address.addressLine} {address.city} {address.state}{" "}
              {address.country} {address.zipcode}
            </span>
          }
          change={
            <span
              onClick={() => setCurrentModal(ModalTypeEnum.CHANGE_ADDRESS)}
              role={`${ModalTypeEnum.CHANGE_ADDRESS}`}
            >
              {t("CHANGE")}
            </span>
          }
        />

        <InfoRowComponent
          name={t("TERMS_AND_CONDITIONS")}
          value={renderTerms()}
        />

        {/* <InfoRowComponent
          name={t("ACCOUNT_CLOSURE")}
          value={
            <StyledButton onClick={() => setIsDeletionModalVisible(true)}>
              {t("CLOSE_ACCOUNT")}
            </StyledButton>
          }
        /> */}
      </StyledCard>
      <CoreModal
        title={t(currentModal !== null ? currentModal : "")}
        centered
        visible={currentModal !== null}
        onCancel={closeModal}
        onOk={closeModal}
        maskClosable={false}
        footer={null}
        forceRender
      >
        <CoreForm
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ address: { country: "US" } }}
          role={"editForm"}
          form={form}
        >
          {generateFormItems()}
          {error && (
            <ErrorContainer
              justify="center"
              align="middle"
              gutter={[32, 32]}
              role="error"
            >
              <Col span={24}>
                <CoreAlert message={t("API_ERROR")} type="error" showIcon />
              </Col>
            </ErrorContainer>
          )}
          <Row>
            <Col span={24}>
              <CoreButton
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isLoading}
              >
                {t("UPDATE")}
              </CoreButton>
            </Col>
          </Row>
        </CoreForm>
      </CoreModal>
      <DeletionModalComponent
        isDeletionModalVisible={isDeletionModalVisible}
        setIsDeletionModalVisible={setIsDeletionModalVisible}
      />
      <ChangeEmailModal
        isModalVisible={isChangeEmailModalVisible}
        setIsModalVisible={setIsChangeEmailModalVisible}
      />
    </>
  );
};

export { PersonalDetailsComponent };
