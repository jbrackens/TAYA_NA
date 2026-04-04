import * as React from "react";
import { useField } from "formik";
import set from "date-fns/set";
import isValid from "date-fns/isValid";
import format from "date-fns/format";
import formatISO from "date-fns/formatISO";

import { DatePicker } from "../../components";
import { getMaltaHourOffset } from "../../utils/getMaltaHourOffset";
import trimTimezone from "../../utils/trimTimezone";

interface IProps {
  name: string;
  minDate?: Date | null;
  placeholder?: string;
  disabled?: boolean;
}

const DatePickerField: React.FC<IProps> = ({ name, placeholder, minDate, disabled }) => {
  const [field, meta, helpers] = useField(name);

  const { onBlur } = field;
  const { value, touched, error } = meta;
  const { setValue, setTouched } = helpers;

  const handleChange = React.useCallback(
    (date: Date) => {
      setTouched(true);

      if (!isValid(date) || date === null) {
        return setValue(null);
      }

      if (name === "startTime" && !value) {
        return setValue(`${trimTimezone(formatISO(set(date, { hours: 12 })))}+0${getMaltaHourOffset()}:00`);
      }

      if (name === "endTime" && !value) {
        return setValue(
          `${trimTimezone(formatISO(set(date, { hours: 23, minutes: 59 })))}+0${getMaltaHourOffset()}:00`
        );
      }

      setValue(format(date, "yyyy-MM-dd"));
    },
    [setValue, setTouched, name, value]
  );
  const isError = touched && !!error;

  return (
    <DatePicker
      value={value}
      name={name}
      placeholder={placeholder}
      minDate={minDate}
      onBlur={onBlur}
      onChange={handleChange}
      disabled={disabled}
      error={isError}
    />
  );
};

export { DatePickerField };
