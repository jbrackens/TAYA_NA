import * as React from "react";
import cn from "classnames";
import styled from "styled-components";

const StyledBaseInput = styled.div`
  width: 100%;
  position: relative;

  .base-input__input-component {
    width: 100%;
    padding: 16px;
    background: ${({ theme }) => theme.palette.secondaryLightest};
    border-radius: ${({ theme }) => theme.shape.borderRadius};
    color: ${({ theme }) => theme.palette.primary};

    border: none;
    appearance: none;

    ${({ theme }) => theme.typography.text16};

    &:hover {
      box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.secondaryLight};
    }

    &::placeholder {
      color: ${({ theme }) => theme.palette.primary};
    }

    &::-ms-expand {
      display: none;
    }
  }

  .base-input__input-component--appearance--contrast {
    background: ${({ theme }) => theme.palette.contrast};
  }

  .base-input__input-component--right-icon {
    padding-right: 40px;
  }

  .base-input__input-component--left-icon {
    padding-left: 40px;
  }

  .base-input__icon {
    position: absolute;
    height: 24px;
    width: 24px;
    top: 50%;

    transform: translateY(-50%);

    &--right,
    &--left {
      fill: ${({ theme }) => theme.palette.secondaryDark};
    }

    &--right {
      right: 13px;
    }

    &--left {
      left: 9px;
    }

    &--check-mark,
    &--right--success {
      fill: ${({ theme }) => theme.palette.accent};
    }

    &--check-mark {
      right: 14px;
    }
  }

  /*
    Focus state
  */
  .base-input__input-component:focus {
    outline: 0;
    box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.accent};
  }

  .base-input__input-component:focus + .base-input__icon {
    fill: ${({ theme }) => theme.palette.accent};
  }

  /*
    Error state
  */
  .base-input__input-component--error,
  .base-input__input-component--error:focus {
    box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.error};
  }

  .base-input__input-component--error + .base-input__icon,
  .base-input__input-component--error:focus + .base-input__icon {
    fill: ${({ theme }) => theme.palette.error};
  }

  /*
    Success state
  */
  .base-input__input-component--success,
  .base-input__input-component--success:focus {
    box-shadow: 0 0 0 1px ${({ theme }) => theme.palette.success};
  }

  .base-input__input-component--success + .base-input__icon,
  .base-input__input-component--success:focus + .base-input__icon {
    fill: ${({ theme }) => theme.palette.success};
  }

  .base-input__input-component--deposit {
    padding: 16px;
  }

  /* Clears the "X" from IE */
  input[type="search"]::-ms-clear,
  input[type="search"]::-ms-reveal {
    display: none;
    width: 0;
    height: 0;
  }

  /* Clears the "X" from Chrome */
  input[type="search"]::-webkit-search-decoration,
  input[type="search"]::-webkit-search-cancel-button,
  input[type="search"]::-webkit-search-results-button,
  input[type="search"]::-webkit-search-results-decoration {
    display: none;
  }
`;

export interface BaseInputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
  inputComponent?: "input" | "select";
  classes?: {
    root?: string;
    input?: string;
    icon?: string;
  };
  appearance?: "default" | "contrast";
  error?: boolean;
  touched?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  checkMarkIcon?: React.ReactNode;
}

/**
 *
 * @param pattern if specified user won't be able to insert value that doesn't match passed regex
 * or empty value
 */
const BaseInput = React.forwardRef<
  HTMLInputElement | HTMLSelectElement,
  BaseInputProps
>(
  (
    {
      inputComponent = "input",
      classes = {},
      className,
      appearance = "default",
      error,
      touched,
      success,
      rightIcon,
      leftIcon,
      checkMarkIcon,
      onChange,
      value: currentValue,
      pattern,
      ...props
    },
    ref
  ) => {
    const onChangeWithPattern = (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      if (onChange) {
        if (
          !!pattern &&
          inputComponent === "input" &&
          !!e.target.value &&
          !e.target.value.match(new RegExp(pattern))
        ) {
          // Prevent to set new, incorrect value
          e.target.value = `${currentValue}`;
          onChange(e);
        } else {
          onChange(e);
        }
      }
    };

    const inputClasses = React.useMemo(
      () =>
        cn(classes.input, "base-input__input-component", {
          [`base-input__input-component--appearance--${appearance}`]: true,
          "base-input__input-component--left-icon": !!leftIcon,
          "base-input__input-component--right-icon":
            !!rightIcon || !!checkMarkIcon,
          "base-input__input-component--error": error,
          "base-input__input-component--success": success
        }),
      [appearance, leftIcon, rightIcon, checkMarkIcon, error, success]
    );

    return (
      <StyledBaseInput className={cn(className, classes.root)}>
        {leftIcon && (
          <div
            className={cn(
              "base-input__icon base-input__icon--left",
              classes.icon,
              {
                "base-input__icon--right--success": !error && touched
              }
            )}
          >
            {leftIcon}
          </div>
        )}
        {inputComponent === "input" ? (
          <input
            className={inputClasses}
            value={currentValue}
            ref={ref as React.MutableRefObject<HTMLInputElement>}
            onChange={onChangeWithPattern}
            {...props}
          />
        ) : (
          <select
            className={inputClasses}
            value={currentValue}
            ref={ref as React.MutableRefObject<HTMLSelectElement>}
            onChange={onChangeWithPattern}
            {...props}
          />
        )}
        {rightIcon && (
          <div
            className={cn(
              "base-input__icon base-input__icon--right",
              classes.icon,
              {
                "base-input__icon--right--success": !error && touched
              }
            )}
          >
            {rightIcon}
          </div>
        )}
        {checkMarkIcon && !error && touched && (
          <div
            className={cn(
              "base-input__icon base-input__icon--check-mark",
              classes.icon
            )}
          >
            {checkMarkIcon}
          </div>
        )}
      </StyledBaseInput>
    );
  }
);

export { BaseInput };
