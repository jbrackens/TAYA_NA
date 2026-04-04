import React from "react";
import { Layout } from "antd";
import { SidebarMenu } from "./SidebarMenu";
import { MenuItem } from "../../../types/menu";

const { Sider } = Layout;

type SidebarComponentProps = {
  menu?: MenuItem[];
  onVisibilityChange: Function;
};

const SidebarComponent: React.FC<SidebarComponentProps> = ({
  menu,
  onVisibilityChange,
}) => {
  return (
    <Sider
      width={200}
      className="site-layout-background"
      style={{
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        left: 0,
      }}
    >
      <SidebarMenu menu={menu} onVisibilityChange={onVisibilityChange} />
    </Sider>
  );
};
export { SidebarComponent };
