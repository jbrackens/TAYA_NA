import React, { useCallback, useState } from "react";
import moment from "moment-timezone";
import { withStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Badge from "@material-ui/core/Badge";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import { BaseDatePickerProps, KeyboardDatePicker } from "@material-ui/pickers";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";

const StyledBadge = withStyles(() => ({
  badge: {
    right: 6,
    top: 6,
  },
}))(Badge);

function getShowBadge(currDay: MaterialUiPickersDate, dates: { day: MaterialUiPickersDate }[]) {
  let showBadge = false;
  dates.forEach(({ day }) => {
    if (moment(day).isSame(currDay)) {
      showBadge = true;
    }
  });
  return showBadge;
}

interface DateRangeProps extends BaseDatePickerProps {
  value: {
    startDate: MaterialUiPickersDate;
    endDate: MaterialUiPickersDate;
  };
  highlightDates: any;
  onDatesChange: ({
    startDate,
    endDate,
  }: {
    startDate: MaterialUiPickersDate | Date | null;
    endDate: MaterialUiPickersDate | Date | null;
  }) => void;
}

function DateRangePicker({ value, onDatesChange, highlightDates, ...rest }: DateRangeProps) {
  const { startDate, endDate } = value;
  const [selectedDateStart, handleChangeDateStart] = useState<any>(
    startDate ? startDate : moment().add(1, "day").toDate(),
  );
  const [selectedDateEnd, handleChangeDateEnd] = useState<MaterialUiPickersDate | Date | null>(
    endDate ? endDate : new Date(),
  );

  const handleSubmit = useCallback(
    () => onDatesChange({ startDate: selectedDateStart, endDate: selectedDateEnd }),
    [onDatesChange, selectedDateEnd, selectedDateStart],
  );

  const dayRenderer = (
    day: MaterialUiPickersDate | null,
    _selectedDate: MaterialUiPickersDate,
    isInCurrentMonth: boolean,
    dayComponent: any,
  ) => {
    const showBadge = getShowBadge(day, highlightDates);

    if (!isInCurrentMonth) return dayComponent;

    return showBadge ? (
      <StyledBadge color="secondary" variant="dot">
        {dayComponent}
      </StyledBadge>
    ) : (
      dayComponent
    );
  };

  return (
    <Box display="flex" height="78px">
      <Box>
        <KeyboardDatePicker
          variant="inline"
          inputVariant="outlined"
          label="From"
          format="DD.MM.yyyy"
          value={selectedDateStart}
          maxDate={selectedDateEnd}
          onChange={date => handleChangeDateStart(date)}
          renderDay={dayRenderer}
          {...rest}
        />
      </Box>
      <Box ml={2}>
        <KeyboardDatePicker
          variant="inline"
          inputVariant="outlined"
          label="To"
          format="DD.MM.yyyy"
          value={selectedDateEnd}
          onChange={date => handleChangeDateEnd(date)}
          renderDay={dayRenderer}
          {...rest}
        />
      </Box>
      <Box ml={1} mt="5px">
        <IconButton aria-label="delete" onClick={handleSubmit}>
          <SearchIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default DateRangePicker;
