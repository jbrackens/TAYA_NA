import React, { FC, ReactNode, ChangeEvent } from "react";
import find from "lodash/find";
import { TextInputProps } from "../TextInput/TextInput";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { BasePhoneNumberInput } from "./BasePhoneNumberInput";

export interface PhoneNumberInputProps extends TextInputProps {
  codes: string[];
  name?: string;
  error?: boolean;
  success?: boolean;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

const PhoneNumberInput: FC<PhoneNumberInputProps> = ({
  codes,
  name = "",
  error,
  success,
  rightIcon,
  children,
  ...inputProps
}) => {
  return (
    <FormikField name={name}>
      {({
        field: { value },
        form
      }: FormikFieldProps<string, { [key: string]: string }>) => {
        const code = value
          ? (find(codes, code => value.startsWith(code)) as string) || ""
          : "";

        const phone = value ? value.slice(code.length) : value;
        const handleCodeChange = (e: ChangeEvent<HTMLSelectElement>) => {
          const newCode = e.target.value;
          form.setFieldValue(name, newCode + (phone || ""));
        };

        const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
          const newPhone = e.target.value;
          form.setFieldValue(name, code + newPhone);
        };

        return (
          <BasePhoneNumberInput
            handleCodeChange={handleCodeChange}
            handlePhoneChange={handlePhoneChange}
            phoneValue={phone}
            codeValue={code}
            error={error}
            success={success}
            rightIcon={rightIcon}
            children={children}
            {...inputProps}
          />
        );
      }}
    </FormikField>
  );
};

export { PhoneNumberInput };
