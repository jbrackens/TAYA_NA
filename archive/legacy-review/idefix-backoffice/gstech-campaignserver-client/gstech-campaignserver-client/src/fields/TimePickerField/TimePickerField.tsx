import * as React from "react";
import { useField } from "formik";
import formatISO from "date-fns/formatISO";
import { isValid } from "date-fns";

import { TimePicker } from "../../components";

interface IProps {
  name: string;
  disabled?: boolean;
}

const TimePickerField: React.FC<IProps> = ({ name, disabled }) => {
  const [field, meta, helpers] = useField(name);

  const { onBlur } = field;
  const { value, touched, error } = meta;
  const { setValue, setTouched } = helpers;

  const handleChange = React.useCallback(
    (date: Date) => {
      if (date === null) {
        setValue(null);
        setTouched(true);
      }

      if (isValid(date)) {
        setValue(formatISO(date));
        setTouched(true);
      }
    },
    [setValue, setTouched]
  );

  const isError = touched && !!error;

  return (
    <TimePicker value={value} name={name} disabled={disabled} error={isError} onBlur={onBlur} onChange={handleChange} />
  );
};

export { TimePickerField };
