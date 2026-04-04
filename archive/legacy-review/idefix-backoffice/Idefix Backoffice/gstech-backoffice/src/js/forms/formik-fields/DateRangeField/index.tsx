import React from "react";
import ReactDateRange from "../../../core/components/dateRange";
import { FieldProps } from "formik/dist/Field";
import { Moment } from "moment";

const DateRangeField = ({ field, form, ...rest }: FieldProps) => {
  const { value, name } = field;
  const { setFieldValue } = form;

  const handleChange = (dates: { startDate: Moment | null; endDate: Moment | null }) => {
    setFieldValue(name, dates);
  };

  return <ReactDateRange value={value} onDatesChange={handleChange} {...rest} />;
};

export default DateRangeField;
