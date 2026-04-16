import React from "react";
import { StyledCollapse } from "./index.styled";
import { DownOutlined } from "@ant-design/icons";
import { CollapseProps } from "antd";

const StyledCollapseComponent: React.FC<CollapseProps & { children?: React.ReactNode }> = (props) => {
  const { children, ...rest } = props;
  return (
    <StyledCollapse
      expandIcon={({ isActive }) => (
        <DownOutlined rotate={isActive ? 180 : 0} />
      )}
      expandIconPosition="right"
      {...rest}
    >
      {props.children}
    </StyledCollapse>
  );
};

export { StyledCollapseComponent };
