import { FC, useState, useEffect, useMemo, useRef } from "react";
import {
  CalenderContainer,
  Header,
  Content,
  TableTd,
  YearDiv,
  MonthDiv,
  TabDiv,
  ContentYear,
  ContentYearOptions,
  TableTdDiv,
  DateWrapper,
} from "./index.styled";
import { Select, Link, Input } from "./..";
type ValueProps = {
  year?: any;
  month?: any;
  day?: any;
};
type CalenderProps = {
  onClick?: (selectedDate: {}) => void;
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  fromYear?: number;
  toYear?: number;
  value?: ValueProps;
  disabled?: boolean;
  error?: string;
  label?: string;
  fullWidth?: boolean;
  placeholder?: string;
  loading?: boolean;
  clearInput?: boolean;
  onInputClear?: () => void;
};
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const Calender: FC<CalenderProps> = ({
  onClick,
  fromYear,
  toYear,
  value = {
    year: toYear ? toYear : new Date().getFullYear(),
    month: new Date().getMonth(),
    day: "",
  },
  onChange,
  onBlur,
  disabled = false,
  error = "",
  label = "",
  fullWidth = false,
  placeholder,
  loading = false,
  clearInput = false,
  onInputClear,
}) => {
  const [display, setDisplay] = useState(false);
  const [year, setYear] = useState(value.year);
  const [month, setMonth] = useState(value.month);
  const [startDay, setStartDay] = useState(new Date(year, month).getDay());
  const [totalDays, setTotalDays] = useState(
    32 - new Date(year, month, 32).getDate(),
  );
  const createDate = (day: number, month: number, year: number) => {
    const dayFormatted = (day < 10 ? "0" : "") + day;
    const monthFormatted = (month < 10 ? "0" : "") + (month + 1);
    return `${dayFormatted}/${monthFormatted}/${year}`;
  };
  const [selected, setSelected] = useState(
    value.day ? createDate(value.day, value.month, value.year) : "",
  );

  useEffect(() => {
    if (value.day) {
      setSelected(createDate(value.day, value.month, value.year));
    } else {
      setSelected("");
    }
  }, [value]);

  const [currentTab, setCurrentTab] = useState("month");

  const yearFrom = fromYear ? fromYear : year - 50,
    yearTo = toYear ? toYear : year + 50;

  useEffect(() => {
    setStartDay(new Date(year, month).getDay());
    setTotalDays(32 - new Date(year, month, 32).getDate());
  }, [year, month]);

  const yearOptions = useMemo(() => {
    let yearOptions = [];
    for (let i = yearTo; i >= yearFrom; i--) {
      yearOptions.push(`${i}`);
    }
    return yearOptions;
  }, []);

  const handleSelectCurrent = (e: any) => {
    setSelected(createDate(e.target.innerText, month, year));
    onClick &&
      onClick({
        day: parseInt(e.target.innerText),
        month: month,
        year: year,
      });
  };

  const handleSelectPrev = (e: any) => {
    const newMonth = month === 0 ? 11 : month - 1,
      newYear = month === 0 ? year - 1 : year;
    if (newYear >= yearFrom) {
      setMonth(newMonth);
      setYear(newYear);
      setSelected(createDate(e.target.innerText, newMonth, newYear));
      onClick &&
        onClick({
          day: parseInt(e.target.innerText),
          month: newMonth,
          year: newYear,
        });
    }
  };

  const handleSelectNext = (e: any) => {
    const newMonth = month === 11 ? 0 : month + 1,
      newYear = month === 11 ? year + 1 : year;
    if (newYear <= yearTo) {
      setMonth(newMonth);
      setYear(newYear);
      setSelected(createDate(e.target.innerText, newMonth, newYear));
      onClick &&
        onClick({
          day: parseInt(e.target.innerText),
          month: newMonth,
          year: newYear,
        });
    }
  };

  const inputChange = (e: any) => {
    if (!e) {
      setSelected("");
      onChange &&
        onChange({
          day: "",
          month: value.month,
          year: value.year,
        });
      onInputClear && onInputClear();
      return;
    }
    const date = e.target.value.split("/");
    let yearFromInput = year,
      monthFromInput = month;
    if (date[2] && date[2].length === 4) {
      let newYear = parseInt(date[2]);
      yearFromInput =
        newYear <= yearTo ? (newYear >= yearFrom ? newYear : yearFrom) : yearTo;
      setYear(yearFromInput);
    }
    if (date[1] && date[1].length > 0) {
      let newMonth = parseInt(date[1]) - 1;
      monthFromInput = newMonth < 12 ? (newMonth >= 0 ? newMonth : 0) : 11;
      setMonth(monthFromInput);
    }
    setSelected(e.target.value);
    onChange &&
      onChange({
        day: parseInt(date[0]) > 31 ? null : parseInt(date[0]),
        month: monthFromInput,
        year: yearFromInput,
      });
  };

  const inputBlur = (e: any) => {
    const date = e.target.value.split("/");
    date.length !== 3 || parseInt(date[0]) > 31
      ? setSelected("")
      : setSelected(createDate(parseInt(date[0]), month, year));
    onBlur &&
      onBlur({
        day: parseInt(date[0]) > 31 ? null : parseInt(date[0]),
        month: month,
        year: year,
      });
  };

  const generateField = () => {
    let date = 1;
    const prevMonthdays =
      32 -
      new Date(
        month === 0 ? year - 1 : year,
        month === 0 ? 11 : month - 1,
        32,
      ).getDate();
    let prevStartDate = prevMonthdays - startDay + 1;
    let nextStartDate = 1;

    const generateRows = (row: number) => {
      let content = [];
      for (let i = 0; i < 7; i++) {
        if (row === 0 && i < startDay) {
          content.push(
            <TableTd key={prevStartDate}>
              <TableTdDiv
                faded
                onClick={handleSelectPrev}
                selected={
                  selected ===
                  createDate(
                    prevStartDate,
                    month === 0 ? 11 : month - 1,
                    month === 0 ? year - 1 : year,
                  )
                }
              >
                {prevStartDate}
              </TableTdDiv>
            </TableTd>,
          );
          prevStartDate++;
        } else if (date > totalDays) {
          content.push(
            <TableTd key={nextStartDate}>
              <TableTdDiv
                faded
                onClick={handleSelectNext}
                selected={
                  selected ===
                  createDate(
                    nextStartDate,
                    month === 11 ? 0 : month + 1,
                    month === 11 ? year + 1 : year,
                  )
                }
              >
                {nextStartDate}
              </TableTdDiv>
            </TableTd>,
          );
          nextStartDate++;
        } else {
          content.push(
            <TableTd key={date}>
              <TableTdDiv
                onClick={handleSelectCurrent}
                selected={selected === createDate(date, month, year)}
              >
                {date}
              </TableTdDiv>
            </TableTd>,
          );
          date++;
        }
      }
      return content;
    };
    let tableRows = [];
    for (let j = 0; j < 6; j++) {
      tableRows.push(<tr key={`row-${j + 1}`}>{generateRows(j)}</tr>);
    }
    return tableRows;
  };

  const generateHeader = useMemo(() => {
    let content = [],
      row = [];
    for (let i = 0; i < 7; i++) {
      row.push(
        <TableTd header key={DAYS[i]}>
          {DAYS[i]}
        </TableTd>,
      );
    }
    content.push(
      <thead>
        <tr>{row}</tr>
      </thead>,
    );
    return content;
  }, []);

  const wrapperRef = useRef<any>(null);
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDisplay(false);
      }
    };
    if (display) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [display]);

  return (
    <DateWrapper ref={wrapperRef}>
      <Input
        onClick={() => setDisplay(true)}
        value={selected}
        onChange={inputChange}
        onBlur={inputBlur}
        placeholder={placeholder ? placeholder : "dd/mm/yyyy"}
        disabled={disabled}
        error={error}
        labelText={label}
        fullWidth={fullWidth}
        loading={loading}
        clearInput={clearInput}
      />
      {display && (
        <CalenderContainer>
          <Header>
            <YearDiv>
              <Select
                compact
                value={`${year}`}
                options={yearOptions}
                className="calender-select"
                onOptionChange={(selectedIndex: any) => {
                  setYear(parseInt(yearOptions[selectedIndex]));
                }}
              />
            </YearDiv>
            <MonthDiv>
              <Select
                compact
                value={MONTHS[month]}
                options={MONTHS}
                className="calender-select"
                onOptionChange={(selectedIndex: any) => setMonth(selectedIndex)}
              />
            </MonthDiv>
            <TabDiv>
              <Link
                onClick={() =>
                  setCurrentTab(currentTab === "month" ? "year" : "month")
                }
              >
                {currentTab === "month" ? "Year" : "Month"}
              </Link>
            </TabDiv>
          </Header>
          {currentTab === "month" && (
            <Content>
              {generateHeader}
              <tbody>{generateField()}</tbody>
            </Content>
          )}
          {currentTab === "year" && (
            <ContentYear>
              {yearOptions.map((yearOp) => (
                <ContentYearOptions
                  key={yearOp}
                  onClick={() => {
                    setYear(parseInt(yearOp));
                    setMonth(0);
                    setCurrentTab("month");
                  }}
                >
                  {yearOp}
                </ContentYearOptions>
              ))}
            </ContentYear>
          )}
        </CalenderContainer>
      )}
    </DateWrapper>
  );
};
