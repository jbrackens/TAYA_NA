import * as React from "react";
import { useField } from "formik";
import formatISO from "date-fns/formatISO";
import { setHours, setMinutes } from "date-fns";
import styled from "styled-components";

import { Select } from "../../components";
import trimTimezone from "../../utils/trimTimezone";
import { getTimes } from "../../utils/getTimesList";
import { getMaltaHourOffset } from "../../utils/getMaltaHourOffset";

const StyledTimePicker = styled.div`
  max-width: 90px;
`;

interface Props {
  name: string;
  disabled?: boolean;
  withoutDate?: boolean;
}

function getOptions() {
  const times = getTimes();

  return times.map((value, idx) => (
    <option key={`${idx}-${value}`} value={value}>
      {value}
    </option>
  ));
}

const DefaultTimePickerField: React.FC<Props> = ({ name, disabled, withoutDate = true }) => {
  const [, meta, helpers] = useField(name);

  const { value, touched, error } = meta;
  const { setValue, setTouched } = helpers;

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const targetValue = e.target.value;
      const hours = targetValue?.split(":")[0];
      const minutes = targetValue?.split(":")[1];

      if (targetValue === "") {
        setValue(null);
        setTouched(true);
        return;
      }

      if (withoutDate && targetValue) {
        setValue(targetValue);
        setTouched(true);
        return;
      }

      const date = value ? setHours(setMinutes(new Date(value), Number(minutes)), Number(hours)) : null;

      if (date) {
        const maltaValue = trimTimezone(formatISO(date)) + `+0${getMaltaHourOffset(date)}:00`;
        setValue(maltaValue);
        setTouched(true);
        return;
      }
    },
    [withoutDate, value, setValue, setTouched]
  );

  const isError = touched && !!error;

  return (
    <StyledTimePicker>
      <Select
        name={name}
        value={withoutDate ? value?.slice(0, 5) : `${value?.split("T")[1]?.slice(0, 5)}` || ""}
        onChange={handleChange}
        disabled={disabled}
        error={isError}
      >
        <option value="">hh:mm</option>
        {getOptions()}
        <option value="23:59">23:59</option>
      </Select>
    </StyledTimePicker>
  );
};

export { DefaultTimePickerField };
