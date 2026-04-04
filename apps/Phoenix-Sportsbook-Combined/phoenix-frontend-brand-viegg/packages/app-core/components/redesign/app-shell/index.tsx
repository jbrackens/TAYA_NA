import React, { ReactNode } from "react";
import {
  BottomNav,
  BottomNavItem,
  MobileActionBar,
  ShellCenter,
  ShellFrame,
  ShellLeftRail,
  ShellRightRail,
  ShellTopBar,
  ShellTopBarSection,
  ShellViewport,
} from "./index.styled";

export type AppShellProps = {
  topBarLeft: ReactNode;
  topBarCenter: ReactNode;
  topBarRight?: ReactNode;
  leftRail: ReactNode;
  centerContent: ReactNode;
  rightRail: ReactNode;
  mobileActionBar?: ReactNode;
  bottomNav?: ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({
  topBarLeft,
  topBarCenter,
  topBarRight,
  leftRail,
  centerContent,
  rightRail,
  mobileActionBar,
  bottomNav,
}) => {
  return (
    <ShellViewport>
      <ShellTopBar>
        <ShellTopBarSection>{topBarLeft}</ShellTopBarSection>
        <ShellTopBarSection>{topBarCenter}</ShellTopBarSection>
        <ShellTopBarSection>{topBarRight}</ShellTopBarSection>
      </ShellTopBar>
      <ShellFrame>
        <ShellLeftRail>{leftRail}</ShellLeftRail>
        <ShellCenter>{centerContent}</ShellCenter>
        <ShellRightRail>{rightRail}</ShellRightRail>
      </ShellFrame>
      {mobileActionBar ? (
        <MobileActionBar>{mobileActionBar}</MobileActionBar>
      ) : null}
      {bottomNav ? <BottomNav>{bottomNav}</BottomNav> : null}
    </ShellViewport>
  );
};

export { BottomNavItem };
