import React, { FC, useEffect } from "react";
import {
  CustomButton,
  CustomField,
  BoldDetails,
  ColorDetails,
} from "./../../index.styled";
import { Display } from "ui";
import { useTranslation } from "next-export-i18n";

const DisplayBilling = ({ data, loading, onButtonClick }) => {
  const { t } = useTranslation();

  return (
    <>
      <CustomField>
        <Display label="Contact info" loading={loading}>
          <BoldDetails>
            {data.first_name} {data.last_name}
          </BoldDetails>
          <ColorDetails>{data.email}</ColorDetails>
          <div>{data.phone_number}</div>
        </Display>
      </CustomField>
      <CustomField>
        <Display label="Company info" loading={loading}>
          <BoldDetails>{data.company_name}</BoldDetails>
          <ColorDetails>{data.billing_email}</ColorDetails>
          <div>
            {t("COMPANY_TAX_ID")}: {data.tax_id}
          </div>
          <div>
            {t("REGISTRATION_NO")}: {data.company_reg_no}
          </div>
        </Display>
      </CustomField>
      <CustomField>
        <Display label="Billing address" loading={loading}>
          <div>{data.address1}</div>
          <div>{data.address2}</div>
          <div>{data.region}</div>
          <div>{data.city}</div>
          <div>{data.postal_code}</div>
          <div>{data.country}</div>
        </Display>
      </CustomField>
      <CustomButton fullWidth onClick={onButtonClick} loading={loading}>
        {t("CHANGE_BILLING")}
      </CustomButton>
    </>
  );
};

export default DisplayBilling;
