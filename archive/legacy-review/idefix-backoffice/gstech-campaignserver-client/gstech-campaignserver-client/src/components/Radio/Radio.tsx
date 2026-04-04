import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

import { RadioChecked, RadioUnchecked } from "../../icons";

const StyledRadio = styled.label`
  display: inline-block;
  width: 24px;
  height: 24px;
  cursor: pointer;

  .disabled {
    cursor: not-allowed;
  }

  .radio__input {
    position: absolute;
    appearance: none;
  }
  .radio__icon {
    position: absolute;
  }
`;

interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Radio: React.FC<RadioProps> = ({ className, ...props }) => (
  <StyledRadio className={cn(className, { disabled: props.disabled })}>
    <input className="radio__input" type="radio" {...props} />
    {props.checked ? (
      <RadioChecked className="radio__icon radio__icon--checked" />
    ) : (
      <RadioUnchecked className="radio__icon radio__icon--unchecked" />
    )}
  </StyledRadio>
);

export { Radio };
