import * as React from "react";
import styled from "styled-components";
import cn from "classnames";

interface IProps {
  icon: React.ReactNode;
  value: string;
  selected?: boolean /** always overridden by BottomNavigation */;
  label?: string;
  badge?: number;
  className?: string;
  onClick?: () => void;
  onChange?: (
    value: string
  ) => void /** always overridden by BottomNavigation */;
}

export const BottomNavigationItem: React.FC<IProps> = ({
  icon,
  value,
  selected,
  label,
  badge,
  className,
  onClick,
  onChange
}) => {
  const handleClick = () => {
    if (onChange) {
      onChange(value);
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <StyledBottomNavigationItem
      className={cn(
        "toolbar-item",
        { "toolbar-item--selected": selected },
        className
      )}
      onClick={handleClick}
    >
      <span className="toolbar-item__wrapper">
        <span className="toolbar-item__icon">{icon}</span>
        {!!label && <span className="toolbar-item__label">{label}</span>}
        {!!badge && badge > 0 && (
          <span className="toolbar-item__badge">{badge}</span>
        )}
      </span>
    </StyledBottomNavigationItem>
  );
};

const StyledBottomNavigationItem = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1 1 0;
  cursor: pointer;

  .toolbar-item {
    &__wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    &__icon {
      svg {
        width: 24px;
        height: 24px;
      }
    }

    &__label {
      ${({ theme }) => theme.typography.text10Bold};
    }

    &__badge {
      ${({ theme }) => theme.typography.text9Bold};
      background: ${({ theme }) => theme.palette.accent};
      color: ${({ theme }) => theme.palette.contrast};
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      top: -15px;
      right: -18px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
    }

    @media (orientation: landscape) {
      &__wrapper {
        flex-direction: row;
      }

      &__label {
        margin-left: 8px;
      }
    }
  }

  &.toolbar-item--accent {
    .toolbar-item__label {
      color: ${({ theme }) => theme.palette.accent};
    }
    .toolbar-item__wrapper {
      .toolbar-item__icon {
        fill: ${({ theme }) => theme.palette.accent};
      }
    }
  }

  &.toolbar-item--main {
    .toolbar-item__wrapper {
      height: 60px;
      width: 60px;
      max-width: 60px;
      color: ${({ theme }) => theme.palette.contrast};
      border-radius: 50%;
      background: ${({ theme }) => theme.palette.accent};
      box-shadow: ${({ theme }) => theme.shadows.gameButton};
    }

    .toolbar-item__icon {
      fill: ${({ theme }) => theme.palette.contrast};
    }

    @media (orientation: landscape) {
      .toolbar-item__wrapper {
        height: 36px;
        width: 36px;
        max-width: 36px;
      }

      .toolbar-item__icon {
        svg {
          width: 18px;
          height: 18px;
        }
      }
    }
  }

  &:not(.toolbar-item--main) {
    color: ${({ theme }) => theme.palette.contrast};

    .toolbar-item__icon {
      fill: ${({ theme }) => theme.palette.contrast};
    }

    &.toolbar-item--selected {
      .toolbar-item__wrapper::after {
        content: "";
        position: absolute;
        bottom: -12px;
        left: calc(50% - 3px);
        height: 6px;
        width: 6px;
        border-radius: 50%;
        background-color: ${({ theme }) => theme.palette.accent};
      }

      @media (orientation: landscape) {
        .toolbar-item__wrapper::after {
          content: "";
          position: absolute;
          border-radius: 99px 99px 0px 0px;
          width: 100%;
          height: 2px;
          bottom: -15px;
          left: 0;
          background-color: ${({ theme }) => theme.palette.accent};
        }
      }

      color: ${({ theme }) => theme.palette.contrast};

      .toolbar-item__icon {
        fill: ${({ theme }) => theme.palette.contrast};
      }
    }
  }

  &.toolbar-item--panic {
    color: ${({ theme }) => theme.palette.error};

    .toolbar-item__icon {
      fill: ${({ theme }) => theme.palette.error};
    }

    &.toolbar-item--selected {
      color: ${({ theme }) => theme.palette.error};

      .toolbar-item__icon {
        fill: ${({ theme }) => theme.palette.error};
      }
    }
  }
`;
