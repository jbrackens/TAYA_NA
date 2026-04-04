import React, { FC } from "react";
import { BaseInputProps } from "../BaseInput";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { useRegistry } from "../../useRegistry";

export type TextInputProps = BaseInputProps;

const TextInput: FC<TextInputProps> = ({ className, name, ...inputProps }) => {
  const { BaseInput } = useRegistry();

  return (
    <FormikField name={name}>
      {({ field }: FormikFieldProps<string, { [key: string]: string }>) => (
        <BaseInput classes={{ input: className }} {...field} {...inputProps} />
      )}
    </FormikField>
  );
};

export { TextInput };
