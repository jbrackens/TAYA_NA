import * as React from "react";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { useIntl } from "react-intl";
import { useRegistry } from "../../useRegistry";
import { TextInputProps } from "../TextInput";
import { FieldProps } from "../Field";

export type TextFieldProps = FieldProps &
  TextInputProps & {
    name: string;
  };

const TextField: React.FC<TextFieldProps> = ({
  name,
  label,
  helper,
  appearance,
  ...textInputProps
}) => {
  const { Field, TextInput } = useRegistry();
  const intl = useIntl();

  return (
    <FormikField name={name}>
      {({
        field,
        form
      }: FormikFieldProps<string, { [key: string]: string }>) => (
        <Field
          name={name}
          label={label}
          helper={helper}
          appearance={appearance}
          errorMessage={
            form.errors[field.name] &&
            intl.formatMessage({ id: form.errors[field.name]! })
          }
        >
          <TextInput id={name} {...field} {...textInputProps} />
        </Field>
      )}
    </FormikField>
  );
};

export { TextField };
