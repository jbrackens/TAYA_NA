import * as React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styled from "styled-components";
import setHours from "date-fns/setHours";
import setMinutes from "date-fns/setMinutes";

import { TextInput } from "../TextInput";

const StyledTextInput = styled.div`
  width: 62px;
`;

const StyledContainer = styled.div`
  border: none;
  box-shadow: ${({ theme }) => theme.shadows.shadow2};

  .react-datepicker__header {
    background-color: ${({ theme }) => theme.palette.white};
  }

  .react-datepicker__time-container
    .react-datepicker__time
    .react-datepicker__time-box
    ul.react-datepicker__time-list
    li.react-datepicker__time-list-item {
    display: flex;
    justify-content: center;
    align-items: center;

    &--selected {
      background-color: ${({ theme }) => theme.palette.blue};
    }
  }
`;

interface ICustomInputProps {
  error?: boolean;
}
// class component is needed

class CustomInput extends React.Component<ICustomInputProps> {
  render() {
    return (
      <StyledTextInput>
        <TextInput className="time-pick__input" {...this.props} autoComplete="off" data-testid="time-picker-input" />
      </StyledTextInput>
    );
  }
}

const Container: React.FC<{ className: string; children: React.ReactNode[] }> = ({ className, children }) => (
  <StyledContainer className={className}>{children}</StyledContainer>
);

interface IProps {
  className?: string;
  value: string | null;
  name?: string;
  error?: boolean;
  onChange: (date: Date, event: any) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const TimePicker: React.FC<IProps> = ({ className, value, name, error = false, onBlur, onChange, disabled }) => (
  <ReactDatePicker
    className={className}
    placeholderText="hh:mm"
    dateFormat="HH:mm"
    timeFormat="HH:mm"
    name={name}
    selected={(value && new Date(value)) || null}
    injectTimes={[setHours(setMinutes(new Date(), 59), 23)]}
    timeIntervals={15}
    showTimeSelect
    showTimeSelectOnly
    calendarContainer={Container}
    customInput={<CustomInput error={error} />}
    onChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
  />
);

export { TimePicker };
