import * as React from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { Breakpoints } from "@brandserver-client/ui";
import { isLandscapeOrientation } from "@brandserver-client/utils";
import { MyAccountLink, getMobile } from "@brandserver-client/lobby";
import { MyAccountSidebar } from "./MyAccountSidebar";
import { use100vh } from "react-div-100vh";

interface IProps {
  children: React.ReactNode;
  sidebarLinks: MyAccountLink[];
}

const StyledMyAccountNavigation = styled.div`
  display: flex;
  width: 100%;
  background-color: ${({ theme }) => theme.palette.primaryLight};

  .myaccount-layout__content {
    overflow: auto;
    width: 100%;
    max-width: 830px;
    padding: 34px 36px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding: 34px 24px;
    }
  }
`;

function getLayoutHeight(height: number, isMobile: boolean): number {
  if (!isMobile) {
    // height - desktop header height
    return height - 80;
  }

  if (!isLandscapeOrientation()) {
    // height - mobile header height - mobile footer height
    return height - 80 - 60;
  }
  // height - mobile footer height when orientation is landscape - mobile header height
  return height - 56 - 60;
}

function getInitialLayoutHeight(isMobile: boolean): string {
  if (!isMobile) {
    // 100vh - header desktop height
    return "calc(100vh - 80px)";
  }
  // 100vh - mobile footer height - mobile header height
  return "calc(100vh - 80px - 60px)";
}

const MyAccountLayout: React.FC<IProps> = ({ children, sidebarLinks }) => {
  const isMobile = useSelector(getMobile);

  const [layoutHeight, setLayoutHeight] = React.useState<string | number>(
    getInitialLayoutHeight(isMobile)
  );
  const height = use100vh();

  React.useEffect(() => {
    if (height) {
      setLayoutHeight(getLayoutHeight(height, isMobile));
    }
  }, [height, isMobile]);

  // TODO: Loader is jumping because each page in {children} has it's own loader and outer height is changing because of useEffect
  return (
    <StyledMyAccountNavigation style={{ height: layoutHeight }}>
      <MyAccountSidebar sidebarLinks={sidebarLinks} />
      <div className="myaccount-layout__content">{children}</div>
    </StyledMyAccountNavigation>
  );
};

export { MyAccountLayout };
