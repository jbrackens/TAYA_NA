import React from "react";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { useMessages } from "@brandserver-client/hooks";
import { toggleMobileMenu, getMobileMenuStatus } from "./duck";
import MobileMenuItems from "./MobileMenuItems";
import { MobileMenuContent } from "./types";
import { ArrowLeftIcon } from "@brandserver-client/icons";

interface Props {
  content: MobileMenuContent[];
}

const StyledMobileMenu = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1101;
  width: 100%;
  overflow-y: scroll;
  background-color: ${({ theme }) => theme.palette.contrast};

  .mobile-menu__back-button-container {
    position: fixed;
    top: 0;
    left: 0;
    background-color: ${({ theme }) => theme.palette.contrast};
    display: flex;
    align-items: center;
    padding: 0px 24px;
    height: 95px;
    width: 100%;
    z-index: 1;
  }

  .mobile-menu__back-arrow {
    fill: ${({ theme }) => theme.palette.primary};
    width: 18px;
    height: 18px;
  }

  .mobile-menu__back-text {
    ${({ theme }) => theme.typography.text24Bold};
    color: ${({ theme }) => theme.palette.primary};
    margin-left: 16px;
  }

  .mobile-menu__items {
    margin-top: 95px;
    padding-bottom: 40px;
  }
`;

const MobileMenu: React.FC<Props> = ({ content }) => {
  const mobileMenuIsOpen = useSelector(getMobileMenuStatus);
  const dispatch = useDispatch();
  const messages = useMessages({
    menu: "mobile-menu.menu"
  });

  const handleToggleMobileMenu = React.useCallback(
    () => dispatch(toggleMobileMenu()),
    [dispatch]
  );

  if (!mobileMenuIsOpen) {
    return null;
  }

  return (
    <StyledMobileMenu>
      <div className="mobile-menu__back-button-container">
        <ArrowLeftIcon
          className="mobile-menu__back-arrow"
          onClick={handleToggleMobileMenu}
        />
        <div className="mobile-menu__back-text">{messages.menu}</div>
      </div>
      <MobileMenuItems
        className="mobile-menu__items"
        toggleMobileMenu={handleToggleMobileMenu}
        content={content}
      />
    </StyledMobileMenu>
  );
};

export default MobileMenu;
