import React from "react";
import { Divider } from "antd";
import { Layout } from "@phoenix-ui/utils";
import { SpaceStyled } from "./index.styled";

export type TableActions = {
  children: React.ReactNode;
};

const TableActions = ({ children }: TableActions) => (
  <SpaceStyled
    size={Layout.Size.MEDIUM}
    align={Layout.Align.END}
    split={<Divider type={Layout.Direction.HORIZONTAL} />}
  >
    {children}
  </SpaceStyled>
);

export default TableActions;
