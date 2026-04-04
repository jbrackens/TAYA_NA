import * as React from "react";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { useRegistry } from "../../useRegistry";
import { ButtonProps, Color, Size, Variant } from "../Button";

export type SubmitButtonProps = ButtonProps;

const SubmitButton: React.FC<SubmitButtonProps> & {
  Color: typeof Color;
  Size: typeof Size;
  Variant: typeof Variant;
} = ({ disabled, ...buttonProps }) => {
  const { Button } = useRegistry();

  return (
    <FormikField>
      {({ form }: FormikFieldProps<string>) => (
        <Button
          disabled={!form.isValid || form.isSubmitting || disabled}
          type="submit"
          {...buttonProps}
        />
      )}
    </FormikField>
  );
};

SubmitButton.Color = Color;
SubmitButton.Size = Size;
SubmitButton.Variant = Variant;

export { SubmitButton };
