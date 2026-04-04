import React from "react";
import { FieldProps } from "formik";
// import ReactDateRange from "../../../core/components/dateRange";
import { Moment } from "moment";

const DateRangeField = ({ field, form, ...rest }: FieldProps) => {
  const { value, name } = field;
  const { setFieldValue } = form;

  const handleChange = (dates: { startDate: Moment | null; endDate: Moment | null }) => {
    setFieldValue(name, dates);
  };

  // return <ReactDateRange value={value} onDatesChange={handleChange} {...rest} />;
  return null;
};

export { DateRangeField };
