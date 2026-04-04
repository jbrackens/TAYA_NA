import * as React from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import enGb from "date-fns/locale/en-GB";
import "react-datepicker/dist/react-datepicker.css";
import styled from "styled-components";

import { TextInput } from "../TextInput";
import { Calendar } from "../../icons";

registerLocale("en-gb", enGb);

const StyledTextInput = styled.div`
  width: 125px;

  &:disabled {
    color: ${({ theme }) => theme.palette.black};
    cursor: not-allowed;
  }
`;

const StyledContainer = styled.div`
  border: none;
  box-shadow: ${({ theme }) => theme.shadows.shadow2};

  .react-datepicker__header {
    background-color: ${({ theme }) => theme.palette.white};
  }

  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: ${({ theme }) => theme.palette.blue};
  }
`;

// class component is needed

interface ICustomInputProps {
  error?: boolean;
}
class CustomInput extends React.Component<ICustomInputProps> {
  render() {
    return (
      <StyledTextInput>
        <TextInput
          icon={<Calendar />}
          {...this.props}
          autoComplete="off"
          error={this.props.error}
          data-testid="date-picker-input"
        />
      </StyledTextInput>
    );
  }
}

const Container: React.FC<{ className: string; children: React.ReactNode[] }> = ({ className, children }) => (
  <StyledContainer className={className}>{children}</StyledContainer>
);

interface IProps {
  name?: string;
  value: string | null;
  placeholder?: string;
  minDate?: Date | null;
  error?: boolean;
  onChange: (date: Date, event: React.SyntheticEvent) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const DatePicker: React.FC<IProps> = ({
  value,
  name,
  placeholder = "dd.mm.yyyy",
  minDate,
  error = false,
  onChange,
  onBlur,
  disabled
}) => (
  <ReactDatePicker
    placeholderText={placeholder}
    dateFormat="dd.MM.yyyy"
    name={name}
    selected={(value && new Date(value)) || null}
    minDate={minDate}
    onChange={onChange}
    onBlur={onBlur}
    customInput={<CustomInput error={error} />}
    calendarContainer={Container}
    locale="en-gb"
    disabled={disabled}
  />
);

export { DatePicker };
