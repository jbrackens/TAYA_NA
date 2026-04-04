import * as React from "react";
import cn from "classnames";
import styled from "styled-components";

import { useLockBodyScroll } from "../../hooks";

const StyledDrawer = styled.div`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.header};
  right: 0;
  bottom: 0;
  top: 0;
  left: 0;

  .drawer__overlay {
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    z-index: ${({ theme }) => theme.zIndex.overlay};
    position: fixed;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }) => theme.palette.blackMiddle};
    opacity: 1;
    transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  }

  .drawer__card {
    top: 0;
    right: 0;
    flex: 1 0 auto;
    height: 100%;
    display: flex;
    outline: 0;
    position: fixed;
    overflow-y: auto;
    flex-direction: column;
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
    background: #f5f5f5;
    width: 496px;
    padding: 32px;
    padding-bottom: 0;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;

    &--opened {
      transform: translateX(0);
      transition: all 225ms cubic-bezier(0, 0, 0.2, 1) 0ms;
    }
  }
`;

interface DrawerLayout {
  children: React.ReactNode;
  drawerCardRef: React.MutableRefObject<null>;
}

const DrawerLayout: React.FC<DrawerLayout> = ({ children, drawerCardRef }) => {
  useLockBodyScroll();
  const [cardOpen, setCardOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    setCardOpen(true);

    return () => setCardOpen(false);
  }, []);

  return (
    <StyledDrawer>
      <div className="drawer__overlay" />
      <div
        className={cn("drawer__card", {
          "drawer__card--opened": cardOpen
        })}
        ref={drawerCardRef}
      >
        {children}
      </div>
    </StyledDrawer>
  );
};

export { DrawerLayout };
