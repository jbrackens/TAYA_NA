import * as React from "react";
import { Field as FormikField, FieldProps as FormikFieldProps } from "formik";
import { useRegistry } from "../../useRegistry";
import { useMessages } from "@brandserver-client/hooks";

const formatDate = (date: { day: string; month: string; year: string }) =>
  `${date.year}-${date.month.padStart(2, "0")}-${date.day.padStart(2, "0")}`;

const removeFrontZeros = (value: string) => {
  /* eslint-disable no-sparse-arrays */
  // TODO: fix type
  const [, clearValue] = value.match(/^0*(\d*)/) || [, ""];
  return clearValue;
};

export interface DateInputProps {
  name?: string;
  error?: string;
  touched?: boolean;
  checkMarkIcon?: React.ReactNode;
}

const DateInput: React.FC<DateInputProps> = ({
  name = "",
  error = "",
  touched,
  checkMarkIcon
}) => {
  const messages = useMessages({
    day: "register.day",
    month: "register.month",
    year: "register.year"
  });
  const { BaseInput } = useRegistry();

  return (
    <FormikField name={name}>
      {({
        field: { value, onChange, onBlur, ...fieldRest },
        form
      }: FormikFieldProps<string>) => {
        const date = {
          day: "",
          month: "",
          year: "0000"
        };

        if (value) {
          [date.year, date.month, date.day] = value.split("-");
        }

        const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const fieldId = e.target.getAttribute("id") || "";
          (date as any)[fieldId] = e.target.value;

          form.setFieldValue(name, formatDate(date));
        };

        // Override blur to fire only when we focus external input
        const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
          try {
            // nextInput may be null if it's not an input
            // or browser doesn't support it - in that case just call onBlur
            const nextInput = e.relatedTarget as HTMLElement;
            const nextInputName = nextInput.getAttribute("name");

            if (nextInputName !== name) {
              onBlur(e);
            }
          } catch (err) {
            onBlur(e);
          }
        };

        return (
          <>
            <BaseInput
              type="tel"
              id="day"
              pattern="^([1-9]|[1-2][0-9]|3[0-1])$"
              value={removeFrontZeros(date.day)}
              onChange={handleDateChange}
              placeholder={messages.day}
              onBlur={handleOnBlur}
              error={!!error}
              {...fieldRest}
            />
            <BaseInput
              type="tel"
              id="month"
              pattern="^([1-9]|1[0-2])$"
              value={removeFrontZeros(date.month)}
              onChange={handleDateChange}
              placeholder={messages.month}
              onBlur={handleOnBlur}
              error={!!error}
              {...fieldRest}
            />
            <BaseInput
              type="tel"
              id="year"
              pattern="^([1-2](0|9)?|19[0-9]{0,2}|20[0-1]?[0-9]?)$"
              value={removeFrontZeros(date.year)}
              onChange={handleDateChange}
              placeholder={messages.year}
              onBlur={handleOnBlur}
              error={!!error}
              touched={touched}
              checkMarkIcon={checkMarkIcon}
              {...fieldRest}
            />
          </>
        );
      }}
    </FormikField>
  );
};

export { DateInput };
