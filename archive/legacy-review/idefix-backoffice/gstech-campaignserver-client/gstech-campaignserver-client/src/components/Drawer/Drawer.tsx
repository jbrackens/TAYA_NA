import * as React from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

import { useOnClickOutside } from "../../hooks";
import { DrawerLayout } from "./DrawerLayout";

interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

const drawerRoot = document.getElementById("drawer-root");

const Drawer: React.FC<DrawerProps> = ({ open, onClose, children }: DrawerProps) => {
  const drawerCardRef = React.useRef(null);
  useOnClickOutside(drawerCardRef, onClose);

  return ReactDOM.createPortal(
    open && <DrawerLayout drawerCardRef={drawerCardRef}>{children}</DrawerLayout>,
    drawerRoot!
  );
};

const StyledDrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .drawer-header__actions {
    display: flex;
    > * {
      margin-left: 8px;
    }
  }
`;

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  actions: React.ReactNode | React.ReactNode[];
}

const DrawerHeader: React.FC<DrawerHeaderProps> = ({ children, actions }: DrawerHeaderProps) => (
  <StyledDrawerHeader>
    <div className="drawer-header__title text-header">{children}</div>
    <div className="drawer-header__actions">{actions}</div>
  </StyledDrawerHeader>
);

const StyledDrawerContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin-top: 32px;
`;

const DrawerContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = props => {
  return <StyledDrawerContent {...props} />;
};

export { Drawer, DrawerHeader, DrawerContent };
