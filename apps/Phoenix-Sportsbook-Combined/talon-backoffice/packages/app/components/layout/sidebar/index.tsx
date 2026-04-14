import React from "react";
import { SidebarMenu } from "./SidebarMenu";
import { CustomSider } from "../index.styled";

type SidebarComponentProps = {
  ref: React.Ref<unknown>;
  isLoading: boolean | undefined;
};

const SidebarComponent: React.FC<SidebarComponentProps> = React.forwardRef(
  ({ isLoading }, ref) => {
    return (
      <CustomSider
        trigger={null}
        width={230}
        breakpoint={"xl"}
        className="site-layout-background"
        style={{
          backgroundColor: "white",
        }}
        collapsedWidth={0}
      >
        <SidebarMenu
          isCollapsed={false}
          isGamesListVisible={false}
          ref={ref}
          isLoading={isLoading}
        />
      </CustomSider>
    );
  },
);
export { SidebarComponent };
