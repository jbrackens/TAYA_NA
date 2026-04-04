import { FC, useCallback, useState } from "react";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import SearchIcon from "@mui/icons-material/Search";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";

import { TransactionDate } from "@idefix-backoffice/idefix/types";

interface Props {
  value: {
    startDate: string | Date | null | undefined;
    endDate: string | Date | null | undefined;
  };
  highlightDates: TransactionDate[];
  onSubmit: ({ startDate, endDate }: { startDate: Date; endDate: Date }) => void;
  disableFuture?: boolean;
}

const DateRangePicker: FC<Props> = ({ value, highlightDates, onSubmit, ...rest }) => {
  const { startDate, endDate } = value;
  const [selectedStartDate, setSelectedStartDate] = useState<any>(startDate ? startDate : new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<any>(endDate ? endDate : new Date());

  const handleSubmit = useCallback(() => {
    onSubmit({ startDate: selectedStartDate, endDate: selectedEndDate });
  }, [onSubmit, selectedEndDate, selectedStartDate]);

  const dayRenderer = (
    day: Date | null,
    _selectedDays: (Date | null)[],
    pickersDayProps: PickersDayProps<Date | null>
  ) => {
    const elem = <PickersDay {...pickersDayProps} />;
    const showBadge = getShowBadge(day, highlightDates);

    return showBadge ? (
      <Badge key={pickersDayProps.key} color="secondary" variant="dot" overlap="circular">
        {elem}
      </Badge>
    ) : (
      elem
    );
  };

  return (
    <Box display="flex" alignItems="center">
      <Box>
        <DesktopDatePicker
          label="From"
          inputFormat="dd.MM.yyyy"
          value={selectedStartDate}
          onChange={date => setSelectedStartDate(date)}
          renderInput={params => <TextField {...params} />}
          renderDay={dayRenderer}
          {...rest}
        />
      </Box>
      <Box ml={2}>
        <DesktopDatePicker
          label="To"
          inputFormat="dd.MM.yyyy"
          value={selectedEndDate}
          onChange={date => setSelectedEndDate(date)}
          renderInput={params => <TextField {...params} />}
          renderDay={dayRenderer}
          {...rest}
        />
      </Box>
      <Box ml={1}>
        <IconButton aria-label="Search" onClick={handleSubmit}>
          <SearchIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

function getShowBadge(currDay: Date | null, dates: TransactionDate[]) {
  let showBadge = false;

  dates.forEach(({ day }) => {
    // TODO use another approach
    const sameDate = currDay?.getDate() === new Date(day).getDate();
    const sameMonth = currDay?.getMonth() === new Date(day).getMonth();
    const sameYear = currDay?.getFullYear() === new Date(day).getFullYear();

    if (sameDate && sameMonth && sameYear) {
      showBadge = true;
    }
  });

  return showBadge;
}

export { DateRangePicker };
