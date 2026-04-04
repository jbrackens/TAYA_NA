import React from "react";
import { SidebarMenu } from "./SidebarMenu";
import { CustomSider } from "../index.styled";

type SidebarComponentProps = {
  ref: any;
  isLoading: boolean | undefined;
};

const SidebarComponent: React.FC<SidebarComponentProps> = React.forwardRef(
  ({ isLoading }, ref) => {
    return (
      <CustomSider
        trigger={null}
        width={200}
        breakpoint={"xl"}
        className="site-layout-background"
        style={{
          backgroundColor: "var(--sb-bg-surface)",
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
