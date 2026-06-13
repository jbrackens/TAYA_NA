import React from "react";
import { Dropdown } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { MoreButton } from "./index.styled";

type DropdownMenuProps = {
  menu: React.ReactElement;
};

const DropdownMenu = ({ menu }: DropdownMenuProps) => {
  return (
    <Dropdown key="more" overlay={menu}>
      <MoreButton shape="round">
        <EllipsisOutlined
          style={{
            fontSize: 20,
            verticalAlign: "top",
          }}
        />
      </MoreButton>
    </Dropdown>
  );
};

export default DropdownMenu;
