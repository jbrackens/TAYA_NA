import * as React from "react";
import cn from "classnames";
import { useOutsideClick } from "@brandserver-client/hooks";
import { ArrowDropDownIcon } from "@brandserver-client/icons";
import { Breakpoints } from "@brandserver-client/ui";
import styled from "styled-components";
import { DropDownContext } from "./context";
import { DropdownMenu } from "./DropdownMenu";

export interface DropdownProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
}

const getInputLabel = (children: React.ReactNode, value: string) => {
  let label = "";

  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && value === child.props.value) {
      label = child.props.children;
    }
  });

  return label;
};

const Dropdown: React.FC<DropdownProps> = ({
  value,
  children,
  icon,
  className,
  onChange
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const dropDownRef = React.useRef(null);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleClose = React.useCallback(() => setIsOpen(false), []);

  useOutsideClick(dropDownRef, handleClose);

  const handleChange = React.useCallback(
    (value: string) => {
      if (onChange) {
        onChange(value);
      }

      handleClose();
    },
    [onChange, handleClose]
  );

  const contextValue = React.useMemo(
    () => ({ isOpen, handleChange }),
    [isOpen, handleChange]
  );

  return (
    <DropDownContext.Provider value={contextValue}>
      <DropdownStyled
        className={cn({ "Dropdown--opened": isOpen }, className)}
        ref={dropDownRef}
      >
        <div className="Dropdown__input" onClick={handleToggle}>
          {icon && <div className="Dropdown__left-icon">{icon}</div>}
          <div className="Dropdown__text">{getInputLabel(children, value)}</div>
          <div className="Dropdown__right-icon">
            <ArrowDropDownIcon />
          </div>
        </div>
        {isOpen && <DropdownMenu>{children}</DropdownMenu>}
      </DropdownStyled>
    </DropDownContext.Provider>
  );
};

const DropdownStyled = styled.div`
  user-select: none;
  position: relative;
  display: flex;
  z-index: 10;

  &.Dropdown--opened {
    .Dropdown__right-icon {
      transform: rotate(180deg) translateY(50%);
    }

    .Dropdown__input {
      border-radius: 0 0 4px 4px;
    }
  }

  .Dropdown__input {
    ${({ theme }) => theme.typography.text12};
    color: ${({ theme }) => theme.palette.contrast};
    line-height: 18px;
    display: flex;
    align-items: center;
    flex: 1;
    padding: 6px 38px 6px 10px;
    border-radius: 4px;
    border: 2px solid #3f3f3f;
    cursor: pointer;
    position: relative;
    background-color: ${({ theme }) => theme.palette.primaryDark};
  }

  .Dropdown__left-icon {
    display: flex;
  }

  .Dropdown__right-icon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);

    svg {
      fill: white;
    }
  }

  .Dropdown__text {
    margin-left: 8px;
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    &.Dropdown--opened {
      .Dropdown__input {
        border-radius: 4px 4px 0 0;
      }
    }
  }
`;

export { Dropdown };
