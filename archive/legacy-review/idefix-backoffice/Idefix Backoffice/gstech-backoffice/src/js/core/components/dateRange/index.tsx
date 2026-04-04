import React, { useState } from "react";
import "react-dates/initialize";
import { DateRangePicker, FocusedInputShape } from "react-dates";
import "react-dates/lib/css/_datepicker.css";
import "./styles.css";
import { Moment } from "moment";

export default ({
  value,
  onDatesChange,
}: {
  value: { startDate: Moment; endDate: Moment };
  onDatesChange: ({ startDate, endDate }: { startDate: Moment | null; endDate: Moment | null }) => void;
}) => {
  const [focusedInput, setFocusedInput] = useState<FocusedInputShape | null>(null);

  return (
    <DateRangePicker
      displayFormat="DD.MM.YYYY"
      startDate={value && value.startDate ? value.startDate : null}
      startDateId="startDate"
      endDate={value && value.endDate ? value.endDate : null}
      endDateId="endDate"
      onDatesChange={({ startDate, endDate }) => onDatesChange({ startDate, endDate })}
      focusedInput={focusedInput}
      onFocusChange={focusedInput => setFocusedInput(focusedInput)}
      isOutsideRange={() => false}
      minimumNights={0}
      firstDayOfWeek={1}
    />
  );
};
