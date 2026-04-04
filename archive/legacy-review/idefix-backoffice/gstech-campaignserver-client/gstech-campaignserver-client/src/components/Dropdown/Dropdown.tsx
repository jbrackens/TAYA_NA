import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

import { useOnClickOutside } from "../../hooks";
import { Arrow } from "../../icons";

const StyledButton = styled.button`
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  outline: none;

  &:hover {
    cursor: pointer;
  }

  &.button--appearance--default {
    background: ${({ theme }) => theme.palette.blue};
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.24);
  }

  &.button--appearance--flat {
    background-color: ${({ theme }) => theme.palette.whiteDirty};

    .button__icon {
      margin-left: 4px;
      fill: ${({ theme }) => theme.palette.blackDark};
    }

    .button__title {
      color: ${({ theme }) => theme.palette.blackDark};
    }
  }

  .button__title {
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
    color: ${({ theme }) => theme.palette.white};
  }

  .button__icon {
    transform: rotate(180deg);
    fill: ${({ theme }) => theme.palette.white};
  }

  .button__icon-container {
    display: flex;
    padding-left: 4px;

    .isOpen {
      transform: none;
    }
  }
`;

interface DropdownButtonProps {
  appearance: "default" | "flat";
  isMenuOpen: boolean;
  title?: string;
  className?: string;
  onClick: () => void;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({ title, isMenuOpen, className, onClick, appearance }) => (
  <StyledButton onClick={onClick} type="button" className={cn(className, `button--appearance--${appearance}`)}>
    <span className="button__title">{title}</span>
    <div className="button__icon-container">
      <Arrow className={cn("button__icon", { isOpen: isMenuOpen })} />
    </div>
  </StyledButton>
);

const StyledDropdown = styled.div`
  display: flex;
  width: fit-content;
  position: relative;

  .dropdown__button {
    &:hover {
      cursor: pointer;
    }
  }

  .dropdown__menu {
    display: flex;
    position: absolute;
    z-index: 1;
    top: 40px;
    width: max-content;
  }

  .right-align {
    right: 0;
  }
`;

interface DropdownProps {
  appearance?: "default" | "flat";
  children: React.ReactNode;
  title?: string;
  button?: React.ReactElement;
  align?: "right" | "left";
  autoClose?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  children,
  button,
  align = "left",
  title,
  className,
  autoClose = true,
  appearance = "default"
}) => {
  const [isMenuOpen, setMenuOpen] = React.useState<boolean>(false);
  const ref = React.useRef(null);

  const handleStopPropagation = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => e.stopPropagation(),
    []
  );

  const handleCloseMenu = () => {
    setMenuOpen(false);
  };
  const handleToggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  useOnClickOutside(ref, handleCloseMenu);

  const dropdownButton =
    button &&
    React.cloneElement(button, {
      className: "dropdown__button",
      onClick: handleToggleMenu
    });

  return (
    <StyledDropdown ref={ref} className={className || ""} onClick={handleStopPropagation}>
      {dropdownButton || (
        <DropdownButton isMenuOpen={isMenuOpen} title={title} onClick={handleToggleMenu} appearance={appearance} />
      )}
      {isMenuOpen && (
        <div
          className={cn("dropdown__menu", {
            "right-align": align === "right"
          })}
          onClick={autoClose ? handleCloseMenu : undefined}
        >
          {children}
        </div>
      )}
    </StyledDropdown>
  );
};

export { Dropdown };
