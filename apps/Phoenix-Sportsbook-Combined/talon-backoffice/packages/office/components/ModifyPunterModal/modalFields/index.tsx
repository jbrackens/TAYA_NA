import React from "react";
import { Input, Form, Select } from "antd";
import { FormFieldWrapper } from "./../index.styled";
const { Option } = Select;
import { useTranslation } from "i18n";
import { getFieldOptions } from "./../editModalUtils";

type ModalFieldsProps = {
  fields: {};
  fieldChanged?: () => void;
  customFieldDetails?: any;
  horizontalLayout?: boolean;
};

export const ModalFields = ({
  fields,
  fieldChanged,
  customFieldDetails,
  horizontalLayout,
}: ModalFieldsProps) => {
  const { t } = useTranslation("edit-modal");
  return (
    <FormFieldWrapper
      $horizontalLayout={horizontalLayout ? horizontalLayout : false}
    >
      {Object.keys(fields).map((fieldVal) => {
        let validations: any = [
          { required: true, message: t("REQUIRED_ERROR") },
        ];
        if (customFieldDetails && !!customFieldDetails[fieldVal]?.rules) {
          validations = [...validations, ...customFieldDetails[fieldVal].rules];
        }
        const fieldType =
          customFieldDetails && customFieldDetails[fieldVal]?.field
            ? customFieldDetails[fieldVal].field
            : "input";
        return (
          <Form.Item
            key={fieldVal}
            name={fieldVal}
            label={fieldVal}
            rules={validations}
            validateTrigger="onBlur"
          >
            {fieldType === "input" ? (
              <Input
                type={
                  customFieldDetails && customFieldDetails[fieldVal]?.type
                    ? customFieldDetails[fieldVal].type
                    : "string"
                }
                placeholder={t("INPUT_PLACEHOLDER")}
                onChange={fieldChanged}
              />
            ) : (
              <Select
                placeholder={t("INPUT_PLACEHOLDER")}
                onChange={fieldChanged}
                showSearch
              >
                {getFieldOptions(fieldVal).map((obj: any) => {
                  return (
                    <Option key={obj.value} value={obj.value}>
                      {obj.label}
                    </Option>
                  );
                })}
              </Select>
            )}
          </Form.Item>
        );
      })}
    </FormFieldWrapper>
  );
};

ModalFields.defaultValues = {
  customFieldDetails: {
    type: "string",
    rules: [],
    horizontalLayout: "vertical",
  },
};
