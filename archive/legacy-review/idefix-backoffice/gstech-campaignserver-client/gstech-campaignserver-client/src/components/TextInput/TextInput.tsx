import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledTextInput = styled.div`
  position: relative;
  display: flex;
  min-width: 56px;
  height: 32px;
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.shadow1};

  &.text-input--withAdornment {
    outline: none;
    &:hover {
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.24);
    }
    &:focus-within {
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.64);
      & > .text-input__adornment {
        color: ${({ theme }) => theme.palette.black};
      }
    }

    &.text-input--error {
      border: 1px solid ${({ theme }) => theme.palette.red};
      color: ${({ theme }) => theme.palette.red};
      & > .text-input__adornment {
        border-right-color: ${({ theme }) => theme.palette.red};
      }
    }
  }

  input {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.palette.white};
    padding: 6px 8px;
    border-radius: 8px;
    border: none;

    &:disabled {
      color: ${({ theme }) => theme.palette.black};
      cursor: not-allowed;

      a & + .text-input__icon {
        fill: ${({ theme }) => theme.palette.black};
      }
    }

    &.input--withAdornment {
      border-radius: 0px 8px 8px 0px;
      outline: none;
    }

    &.input--withoutAdornment {
      &:hover {
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.24);
      }
      &:focus {
        box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.64);
        outline: none;
      }
      &:not(:placeholder-shown) {
        &:not(:focus) {
          box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.24);
        }
      }
    }

    ::placeholder {
      color: ${({ theme }) => theme.palette.blackMiddle};
    }
  }

  .text-input__adornment {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    padding: 6px;
    border-radius: 8px 0px 0px 8px;
    border-right: 1px solid ${({ theme }) => theme.palette.blackLight};
    background: ${({ theme }) => theme.palette.whiteDirty};
    color: ${({ theme }) => theme.palette.blackDark};
  }

  &.with-icon > input {
    padding-right: 36px;
  }

  &.text-input--error > input {
    &.input--withoutAdornment {
      border: 1px solid ${({ theme }) => theme.palette.red};
      color: ${({ theme }) => theme.palette.red};
    }
  }

  input:focus + .text-input__icon {
    fill: ${({ theme }) => theme.palette.black};
  }

  &.text-input--error > div.text-input__icon {
    fill: ${({ theme }) => theme.palette.red};
  }

  .text-input__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    pointer-events: none;

    fill: ${({ theme }) => theme.palette.blackMiddle};
  }
`;

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
  inputAdornment?: string;
  isSubmitting?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  icon,
  error,
  inputAdornment,
  className,
  pattern = "",
  value = "",
  onChange,
  isSubmitting,
  ...rest
}) => {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isSubmitting) return;

      if (onChange) {
        onChange(e);
      }
    },
    [isSubmitting, onChange]
  );

  const handleChangeWithPattern = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isSubmitting) return;

      const isRegexMatch = (value: string) => !!value.match(new RegExp(pattern));

      if (onChange) {
        if (isRegexMatch(e.target.value)) {
          onChange(e);
        } else {
          e.target.value = `${value}`;
          onChange(e);
        }
      }
    },
    [isSubmitting, onChange, pattern, value]
  );

  return (
    <StyledTextInput
      className={cn(className, {
        "with-icon": !!icon,
        "text-input--withAdornment": !!inputAdornment,
        "text-input--error": error
      })}
    >
      {!!inputAdornment && <div className="text-input__adornment text-main-reg">{inputAdornment}</div>}
      <input
        type="text"
        className={cn("text-input__input text-main-reg", {
          "input--withAdornment": !!inputAdornment,
          "input--withoutAdornment": !inputAdornment
        })}
        value={value}
        onChange={!!pattern ? handleChangeWithPattern : handleChange}
        {...rest}
      />
      {icon && <div className="text-input__icon">{icon}</div>}
    </StyledTextInput>
  );
};

export default React.memo(TextInput);
