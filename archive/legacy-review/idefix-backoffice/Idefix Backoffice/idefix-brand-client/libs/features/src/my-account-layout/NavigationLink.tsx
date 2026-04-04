import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import cn from "classnames";
import styled from "styled-components";
import { rgba } from "@brandserver-client/utils";

interface IProps {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  badge?: number;
  as?: string;
  className?: string;
  onClick?: () => void;
}

const StyledNavigationLink = styled.li`
  &.sidebar-main-link {
    display: flex;
    padding: 14px 0;

    &--active {
      & > .sidebar-main-inner-link:after {
        content: "";
        width: 4px;
        height: 100%;
        position: absolute;
        top: 0;
        right: 0;
        border-radius: 10px 0px 0px 10px;
        background-color: ${({ theme }) => theme.palette.accent};
      }

      a.sidebar-nav-link {
        color: ${({ theme }) => theme.palette.accent};
        ${({ theme }) => theme.typography.text16Bold};

        & > .sidebar-nav-link__icon > svg {
          fill-opacity: 1;
          fill: ${({ theme }) => theme.palette.accent};
        }
      }
    }
  }

  .sidebar-main-inner-link {
    position: relative;
    display: flex;
    padding: 0px 28px;
    width: 100%;
  }

  .sidebar-nav-link {
    position: relative;
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => `${rgba(theme.palette.contrast, 0.8)}`};
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    cursor: pointer;

    &:hover {
      color: ${({ theme }) => theme.palette.contrast};

      & > .sidebar-nav-link__icon svg {
        fill-opacity: 1;
        fill: ${({ theme }) => theme.palette.contrast}};
      }
    }
  }

  .sidebar-nav-link__icon {
    display: inline-flex;
    margin-right: 12px;

    svg {
      width: 24px;
      height: 24px;
      fill: ${({ theme }) => theme.palette.contrast};
      fill-opacity: ${({ theme }) => 0.8};
    }
  }

  .sidebar-nav-link__badge {
    position: absolute;
    ${({ theme }) => theme.typography.text9};
    font-weight: bold;
    background-color: ${({ theme }) => theme.palette.accent};
    color: ${({ theme }) => theme.palette.contrast};
    min-width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
    right: -20px;
    top: -4px;
  }
`;

const NavigationLink: React.FC<IProps> = ({
  className,
  icon,
  children,
  badge,
  onClick,
  ...rest
}) => {
  const { asPath } = useRouter();

  const isActive = asPath === rest.href;

  const renderNavItem = () => (
    <a className="sidebar-nav-link">
      <span className="sidebar-nav-link__icon">{icon}</span>
      {children}
      {badge && badge > 0 ? (
        <span className="sidebar-nav-link__badge">{badge}</span>
      ) : null}
    </a>
  );

  return (
    <StyledNavigationLink
      className={cn(
        "sidebar-main-link",
        { "sidebar-main-link--active": isActive },
        className
      )}
    >
      <div className="sidebar-main-inner-link">
        {onClick ? (
          <div onClick={onClick}>{renderNavItem()}</div>
        ) : (
          <Link {...rest}>{renderNavItem()}</Link>
        )}
      </div>
    </StyledNavigationLink>
  );
};

export default NavigationLink;
