import React, { ReactNode } from "react";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";

interface Props {
  Icon: React.FC<{ className?: string }>;
  locale: string;
  href?: string;
  as?: string;
  onClick: () => any;
  children?: ReactNode;
  className?: string;
  badge?: number | string;
}

export const StyledMobileMenuItem = styled.div`
  display: flex;
  align-items: center;

  .menu-item__text {
    ${({ theme }) => theme.typography.text18Bold};
    color: ${({ theme }) => theme.palette.primary};
    margin-left: 16px;
    position: relative;
  }

  .menu-item__badge {
    ${({ theme }) => theme.typography.text9};
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    top: -12px;
    right: -16px;
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.palette.contrast};
    background-color: ${({ theme }) => theme.palette.accent};
  }
`;

const MobileMenuItem = ({ Icon, locale, onClick, className, badge }: Props) => {
  const messages = useMessages({
    text: locale
  });

  return (
    <StyledMobileMenuItem onClick={onClick} className={className}>
      <Icon className="menu-item__icon" />
      <div className="menu-item__text">
        {messages.text}
        {badge && <div className="menu-item__badge">{badge}</div>}
      </div>
    </StyledMobileMenuItem>
  );
};

export default MobileMenuItem;
