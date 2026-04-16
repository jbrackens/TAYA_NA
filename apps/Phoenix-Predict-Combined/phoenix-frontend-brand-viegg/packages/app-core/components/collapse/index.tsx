import React from "react";
import { StyledCollapse } from "./index.styled";
import { DownOutlined } from "@ant-design/icons";

const StyledCollapseComponent: React.FC<any> = (props) => {
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
