import * as React from "react";
import styled from "styled-components";

import { CheckboxChecked, CheckboxUnchecked } from "../../icons";

const StyledCheckbox = styled.label`
  display: inline-block;
  width: 24px;
  height: 24px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }

  .checkbox__input {
    position: absolute;
    appearance: none;
  }
  .checkbox__icon {
    position: absolute;
  }
`;

const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <StyledCheckbox className={className}>
    <input className="checkbox__input" type="checkbox" {...props} />
    {props.checked ? (
      <CheckboxChecked className="checkbox__icon checkbox__icon--checked" />
    ) : (
      <CheckboxUnchecked className="checkbox__icon checkbox__icon--unchecked" />
    )}
  </StyledCheckbox>
);

export { Checkbox };
