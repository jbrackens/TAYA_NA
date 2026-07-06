import React from "react";
import { Dropdown } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { MoreButton } from "./index.styled";

type DropdownMenuProps = {
  menu: React.ReactElement;
};

const DropdownMenu = ({ menu }: DropdownMenuProps) => {
  return (
    <Dropdown key="more" dropdownRender={() => menu}>
      <MoreButton shape="round">
        <EllipsisOutlined className="align-top text-xl" />
      </MoreButton>
    </Dropdown>
  );
};

export default DropdownMenu;
