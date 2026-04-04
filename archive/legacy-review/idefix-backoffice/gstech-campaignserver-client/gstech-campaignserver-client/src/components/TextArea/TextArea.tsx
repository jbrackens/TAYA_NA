import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledTextArea = styled.div`
  position: relative;
  display: flex;
  border-radius: 8px;

  &.--error {
    border: 1px solid ${({ theme }) => theme.palette.red};
    color: ${({ theme }) => theme.palette.red};
  }

  textarea {
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 20px;
    border-radius: 8px;
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
    background: ${({ theme }) => theme.palette.white};
    padding: 6px 8px;
    &:hover {
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24);
    }
    &:focus {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.64);
    }
    &:not(:placeholder-shown) {
      &:not(:focus) {
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24);
      }
    }
    &:disabled {
      cursor: not-allowed;
    }
    ::placeholder {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }
`;

interface TextInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const TextArea: React.FC<TextInputProps> = ({ error, className, value = "", ...rest }) => (
  <StyledTextArea
    className={cn(className, {
      "--error": error
    })}
  >
    <textarea value={value} {...rest} />
  </StyledTextArea>
);

export default React.memo(TextArea);
