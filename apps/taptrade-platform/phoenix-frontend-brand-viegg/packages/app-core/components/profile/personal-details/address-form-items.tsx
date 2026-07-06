import React from "react";
import { useTranslation } from "i18n";
import { CountrySelect } from "../../../components/form/country-select";
import { states } from "../../auth/register/step4/states-list";
import { CoreInput } from "../../ui/input";
import { CoreSelect } from "../../ui/select";
import { CoreForm } from "../../ui/form";
import { SelectContainer } from "../../ui/form/index.styled";
import { FormInstance } from "antd/lib/form";

const AddressFormItems: React.FC<{ form: FormInstance }> = ({ form }) => {
  const { t } = useTranslation(["register"]);
  const { Option, OptionContent } = CoreSelect;

  const stateSelector = (
    <CoreForm.Item name={["address", "state"]}>
      <CoreSelect
        placeholder={t("STATE")}
        dropdownStyle={{
          backgroundColor: "transparent",
        }}
        getPopupContainer={(triggerNode: HTMLElement) =>
          triggerNode.parentNode as HTMLElement
        }
      >
        {states.map((state) => (
          <Option value={state.abbreviation} key={state.abbreviation}>
            <OptionContent>{state.name}</OptionContent>
          </Option>
        ))}
      </CoreSelect>
    </CoreForm.Item>
  );

  return (
    <>
      <CoreForm.Item
        label={t("ADDRESS_LINE")}
        name={["address", "addressLine"]}
        rules={[
          {
            required: true,
            message: t("ADDRESS_LINE_ERROR"),
          },
        ]}
      >
        <CoreInput
          onBlur={(value) => {
            form.setFieldsValue({
              address: { addressLine: value.currentTarget.value.trim() },
            });
          }}
        />
      </CoreForm.Item>

      <CoreForm.Item
        label={t("CITY")}
        name={["address", "city"]}
        rules={[
          {
            required: true,
            message: t("CITY_ERROR"),
          },
        ]}
      >
        <CoreInput
          onBlur={(value) => {
            form.setFieldsValue({
              address: { city: value.currentTarget.value.trim() },
            });
          }}
        />
      </CoreForm.Item>

      <CoreForm.Item
        label={t("STATE")}
        name={["address", "state"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_rule) {
              if (getFieldValue(["address", "state"]) !== undefined) {
                return Promise.resolve();
              }
              return Promise.reject(t("STATE_ERROR"));
            },
          }),
        ]}
      >
        <SelectContainer>{stateSelector}</SelectContainer>
      </CoreForm.Item>

      <CoreForm.Item
        label={t("ZIP_CODE")}
        name={["address", "zipcode"]}
        rules={[
          {
            required: true,
            message: t("ZIP_CODE_ERROR"),
          },
        ]}
      >
        <CoreInput
          onBlur={(value) => {
            form.setFieldsValue({
              address: { zipcode: value.currentTarget.value.trim() },
            });
          }}
        />
      </CoreForm.Item>

      <CountrySelect
        label={t("COUNTRY")}
        name={["address", "country"]}
        rules={[
          {
            required: true,
            message: t("COUNTRY_ERROR"),
          },
        ]}
        restrictToCountry="US"
      />
    </>
  );
};

export { AddressFormItems };
