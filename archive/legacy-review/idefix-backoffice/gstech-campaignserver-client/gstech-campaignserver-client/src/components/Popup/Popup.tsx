import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

const StyledPopup = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 192px;
  max-height: 200px;
  padding: 8px 0;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.palette.black};
  box-shadow: ${({ theme }) => theme.shadows.shadow2};
  z-index: ${({ theme }) => theme.zIndex.popup};

  .scroll-wrapper {
    overflow: auto;

    &::-webkit-scrollbar {
      appearance: none;

      &:vertical {
        width: 6px;
      }

      &-thumb {
        background-color: #fff;
        border-radius: 3px;
      }
    }
  }
`;

const StyledMenuItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  min-height: 32px;
  padding: 6px 16px;
  background-color: ${({ theme }) => theme.palette.black};
  color: ${({ theme }) => theme.palette.white};
  cursor: pointer;

  .menu-item__image {
    width: 20px;
  }

  .menu-item__icon--color--red {
    fill: ${({ theme }) => theme.palette.red};
  }

  &.menu-item--disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  &:hover {
    background-color: ${({ theme }) => theme.palette.whiteMiddle};
    transition: 0.1s;

    svg {
      fill: ${({ theme }) => theme.palette.white};
      transition: 0.1s;
    }
  }

  svg {
    fill: ${({ theme }) => theme.palette.whiteDark};
  }

  &.menu-item--color--red {
    color: ${({ theme }) => theme.palette.red};

    svg {
      fill: ${({ theme }) => theme.palette.red};
    }
  }
`;

interface PopupProps {
  children: React.ReactNode;
  className?: string;
}

interface MenuItemProps {
  children: React.ReactNode;
  value: string;
  icon?: React.ReactNode;
  pathToImg?: string;
  className?: string;
  red?: boolean;
  disabled?: boolean;
  onClick: (value: string, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ children, icon, className, red, value, disabled, onClick, pathToImg }) => (
  <StyledMenuItem
    className={cn(className, "text-main-med", { "menu-item--color--red": red, "menu-item--disabled": disabled })}
    onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => onClick(value, event)}
  >
    {children}
    {icon || null}
    {pathToImg ? <img className="menu-item__image" src={pathToImg} alt={value} /> : null}
  </StyledMenuItem>
);

const Popup: React.FC<PopupProps> = ({ children, className }) => (
  <StyledPopup className={className}>
    <div className="scroll-wrapper">{children}</div>
  </StyledPopup>
);

export { Popup, MenuItem };
