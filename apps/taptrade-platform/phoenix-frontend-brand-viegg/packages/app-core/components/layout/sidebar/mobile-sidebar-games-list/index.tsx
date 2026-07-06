import React from "react";
import { SidebarMenu } from "../SidebarMenu";
import { MobileSider, SliderMask } from "./index.styled";

type MobileSidebarComponentProps = {
  isGamesListVisible: boolean;
  ref: any;
  isLoading: boolean | undefined;
};

const MobileSidebarComponent: React.FC<MobileSidebarComponentProps> = React.forwardRef(
  ({ isGamesListVisible, isLoading }, ref) => {
    return (
      <>
        <SliderMask $isGamesListVisible={isGamesListVisible} />
        <MobileSider $isGamesListVisible={isGamesListVisible}>
          <SidebarMenu
            isCollapsed={false}
            isGamesListVisible={false}
            ref={ref}
            isLoading={isLoading}
          />
        </MobileSider>
      </>
    );
  },
);
export { MobileSidebarComponent };
