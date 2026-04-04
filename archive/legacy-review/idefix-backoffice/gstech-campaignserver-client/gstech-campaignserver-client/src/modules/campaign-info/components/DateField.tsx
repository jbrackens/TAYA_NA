import * as React from "react";
import styled from "styled-components";

import { DatePickerField, DefaultTimePickerField } from "../../../fields";

const StyledDateField = styled.div`
  display: flex;

  .picker__time {
    margin-left: 8px;
  }
`;

interface Props {
  name: string;
  minDate?: Date | null;
  disabled?: boolean;
}

const DateField: React.FC<Props> = ({ name, minDate, disabled }) => (
  <StyledDateField>
    <div className="picker__date">
      <DatePickerField name={name} minDate={minDate} disabled={disabled} />
    </div>
    <div className="picker__time">
      <DefaultTimePickerField name={name} disabled={disabled} withoutDate={false} />
    </div>
  </StyledDateField>
);

export default DateField;
