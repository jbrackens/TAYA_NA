import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledButton = styled.button`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: fit-content;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  white-space: nowrap;
  color: ${({ theme }) => theme.palette.blackDark};
  outline: none;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover {
    color: ${({ theme }) => theme.palette.black};
    .button__icon {
      fill: ${({ theme }) => theme.palette.black};
    }
  }

  .button__icon {
    margin-left: 4px;
    fill: ${({ theme }) => theme.palette.blackDark};
  }

  &.with-shadow {
    box-shadow: ${({ theme }) => theme.shadows.shadow1};

    &:hover {
      box-shadow: ${({ theme }) => theme.shadows.shadowHover};
    }

    &:active {
      box-shadow: ${({ theme }) => theme.shadows.shadowActive};
    }
  }

  &.button--appearance--default {
    background-color: ${({ theme }) => theme.palette.white};
  }

  &.button--appearance--flat {
    background-color: ${({ theme }) => theme.palette.whiteDirty};
  }

  &.button--appearance--blue {
    background-color: ${({ theme }) => theme.palette.blue};
    color: ${({ theme }) => theme.palette.white};

    .button__icon {
      fill: ${({ theme }) => theme.palette.white};
    }
  }

  &.button--appearance--orange {
    background-color: ${({ theme }) => theme.palette.orange};
    color: ${({ theme }) => theme.palette.white};

    .button__icon {
      fill: ${({ theme }) => theme.palette.white};
    }
  }

  &.button--appearance--teal {
    background-color: ${({ theme }) => theme.palette.teal};
    color: ${({ theme }) => theme.palette.white};

    .button__icon {
      fill: ${({ theme }) => theme.palette.white};
    }
  }

  &.button--appearance--grey {
    background-color: ${({ theme }) => theme.palette.grey};
    color: ${({ theme }) => theme.palette.white};

    .button__icon {
      fill: ${({ theme }) => theme.palette.white};
    }
  }
`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  appearance?: "default" | "flat" | "blue" | "grey" | "orange" | "teal";
  icon?: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, icon, appearance = "default", className, ...rest }) => {
  const buttonIcon =
    icon && React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, { className: "button__icon" });

  return (
    <StyledButton
      className={cn(className, "text-main-reg", `button--appearance--${appearance}`, {
        "with-shadow": appearance !== "flat"
      })}
      {...rest}
    >
      {children}
      {buttonIcon}
    </StyledButton>
  );
};

export default React.memo(Button);
