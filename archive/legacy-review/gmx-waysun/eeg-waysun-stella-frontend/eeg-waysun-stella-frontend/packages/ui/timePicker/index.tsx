import { FC, useState, useEffect, useMemo, useRef } from "react";
import {
  TimePickerContainer,
  TimeWrapper,
  Selectors,
  SelectoButtonsContainer,
  Footer,
  SelectoButtons,
} from "./index.styled";
import { Input, Button, Link } from "./..";
type timeData = {
  hour: number;
  minute: number;
  second: number;
};

type TimePickerProps = {
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  onTimeChange?: (hour: string, minute: string, second: string) => void;
  value?: timeData;
  disabled?: boolean;
  error?: string;
  label?: string;
  fullWidth?: boolean;
  placeholder?: string;
  loading?: boolean;
  clearInput?: boolean;
  onInputClear?: () => void;
  disableSeconds?: boolean;
};

export const TimePicker: FC<TimePickerProps> = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  error = "",
  label = "",
  fullWidth = false,
  onTimeChange,
  placeholder,
  loading = false,
  clearInput = false,
  onInputClear,
  disableSeconds = false,
}) => {
  const [display, setDisplay] = useState(false);
  const [selectedHour, setSelectedHour] = useState(-1);
  const [selectedMin, setSelectedMin] = useState(-1);
  const [selectedSec, setSelectedSec] = useState(-1);
  const [inputVal, setInputVal] = useState<string>("");
  const wrapperRef = useRef<any>(null);
  const hourRef = useRef<any>(null);
  const hourButtonRef = useRef<any>(null);
  const minRef = useRef<any>(null);
  const minButtonRef = useRef<any>(null);
  const secRef = useRef<any>(null);
  const secButtonRef = useRef<any>(null);

  const generateSelectors = (start: number, end: number) => {
    let options: Array<number> = [];
    for (let i = start; i <= end; i++) {
      options.push(i);
    }
    return options;
  };

  useEffect(() => {
    if (selectedMin + selectedHour + selectedSec !== -3) {
      setInputValue();
      scrollToSelected();
      onTimeChange &&
        onTimeChange(
          `${selectedHour < 10 ? "0" : ""}${selectedHour}`,
          `${selectedMin < 10 ? "0" : ""}${selectedMin}`,
          `${selectedSec < 10 ? "0" : ""}${selectedSec}`,
        );
    }
  }, [selectedHour, selectedMin, selectedSec]);

  useEffect(() => {
    display && scrollToSelected("instant");
  }, [display]);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedHour(value.hour);
      setSelectedMin(value.minute);
      setSelectedSec(value.second);
    } else {
      setInputVal("");
    }
  }, [value]);

  const scrollToSelected = (behavior: "smooth" | "instant" = "smooth") => {
    hourRef.current?.scrollTo({
      left: 0,
      top: hourButtonRef.current?.offsetTop,
      behavior: behavior,
    });
    minRef.current?.scrollTo({
      left: 0,
      top: minButtonRef.current?.offsetTop,
      behavior: behavior,
    });
    secRef.current?.scrollTo({
      left: 0,
      top: secButtonRef.current?.offsetTop,
      behavior: behavior,
    });
  };

  const handleClick = (type: "h" | "m" | "s", value: number, event: any) => {
    switch (type) {
      case "h":
        setSelectedHour(value);
        selectedMin === -1 && setSelectedMin(0);
        selectedSec === -1 && setSelectedSec(0);
        break;
      case "m":
        setSelectedMin(value);
        selectedHour === -1 && setSelectedHour(0);
        selectedSec === -1 && setSelectedSec(0);
        break;
      case "s":
        setSelectedSec(value);
        selectedHour === -1 && setSelectedHour(0);
        selectedMin === -1 && setSelectedMin(0);
        break;
    }
  };

  const hourOptions = useMemo(() => {
    return generateSelectors(0, 23).map((hour) => (
      <SelectoButtons
        $selected={selectedHour === hour}
        onClick={(e: any) => handleClick("h", hour, e)}
        key={hour}
        ref={selectedHour === hour ? hourButtonRef : null}
      >{`${hour < 10 ? "0" : ""}${hour}`}</SelectoButtons>
    ));
  }, [selectedHour]);

  const minuteOptions = useMemo(() => {
    return generateSelectors(0, 59).map((min) => (
      <SelectoButtons
        $selected={selectedMin === min}
        onClick={(e: any) => handleClick("m", min, e)}
        key={min}
        ref={selectedMin === min ? minButtonRef : null}
      >{`${min < 10 ? "0" : ""}${min}`}</SelectoButtons>
    ));
  }, [selectedMin]);

  const secondOptions = useMemo(() => {
    return generateSelectors(0, 59).map((sec) => (
      <SelectoButtons
        $selected={selectedSec === sec}
        onClick={(e: any) => handleClick("s", sec, e)}
        key={sec}
        ref={selectedSec === sec ? secButtonRef : null}
      >{`${sec < 10 ? "0" : ""}${sec}`}</SelectoButtons>
    ));
  }, [selectedSec]);

  const setInputValue = () => {
    if (selectedHour === -1 || selectedMin === -1 || selectedSec === -1) {
      selectedHour === -1 && setSelectedHour(0);
      selectedMin === -1 && setSelectedMin(0);
      selectedSec === -1 && setSelectedSec(0);
    } else {
      setInputVal(
        `${(selectedHour < 10 ? "0" : "") + selectedHour}:${
          (selectedMin < 10 ? "0" : "") + selectedMin
        }${
          !disableSeconds
            ? `:${(selectedSec < 10 ? "0" : "") + selectedSec}`
            : ""
        }`,
      );
    }
  };

  const okClicked = () => {
    setInputValue();
    setDisplay(false);
  };

  const onInputChange = (e: any) => {
    if (!e) {
      setInputVal("");
      onInputClear && onInputClear();
      return;
    }
    const { value } = e.target;
    onChange && onChange(e);
    checkValue(value);
  };

  const checkValue = (value: string) => {
    setInputVal(value);
    if (value.length > 7 || (disableSeconds && value.length === 5)) {
      const time = value.split(":");
      if (time[0].length >= 2) {
        const data = time[0] ? parseInt(time[0]) : selectedHour;
        if (data !== NaN) {
          setSelectedHour(data > -1 && data < 24 ? data : 0);
        }
      }
      if (time[1].length >= 2) {
        const data = time[0] ? parseInt(time[1]) : selectedMin;
        if (data !== NaN) {
          setSelectedMin(data > -1 && data < 60 ? data : 0);
        }
      }
      if (!disableSeconds && time[2].length >= 2) {
        const data = time[0] ? parseInt(time[2]) : selectedSec;
        if (data !== NaN) {
          setSelectedSec(data > -1 && data < 60 ? data : 0);
        }
      }
    }
  };

  const timeNow = () => {
    const currentTime = new Date();
    setSelectedHour(currentTime.getHours());
    setSelectedMin(currentTime.getMinutes());
    setSelectedSec(currentTime.getSeconds());
    setDisplay(false);
  };

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
    <TimeWrapper ref={wrapperRef}>
      <Input
        onClick={() => setDisplay(true)}
        value={inputVal}
        onChange={onInputChange}
        onBlur={onBlur}
        placeholder={
          placeholder ? placeholder : disableSeconds ? "hh:mm" : "hh:mm:ss"
        }
        disabled={disabled}
        error={error}
        labelText={label}
        fullWidth={fullWidth}
        loading={loading}
        clearInput={clearInput}
      />
      {display && (
        <TimePickerContainer>
          <Selectors>
            <SelectoButtonsContainer ref={hourRef}>
              {hourOptions}
            </SelectoButtonsContainer>
            <SelectoButtonsContainer ref={minRef}>
              {minuteOptions}
            </SelectoButtonsContainer>
            {!disableSeconds && (
              <SelectoButtonsContainer ref={secRef}>
                {secondOptions}
              </SelectoButtonsContainer>
            )}
          </Selectors>
          <Footer>
            <div>
              <Link onClick={timeNow}>Now</Link>
            </div>
            <div>
              <Button compact onClick={okClicked}>
                Ok
              </Button>
            </div>
          </Footer>
        </TimePickerContainer>
      )}
    </TimeWrapper>
  );
};
