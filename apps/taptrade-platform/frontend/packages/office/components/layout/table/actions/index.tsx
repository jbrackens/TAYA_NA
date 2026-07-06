import React from "react";
import { Divider, Space } from "antd";
import { Layout } from "@taptrade-ui/utils";

export type TableActions = {
  children: React.ReactNode;
};

const TableActions = ({ children }: TableActions) => (
  <Space
    className="w-full flex-row items-center justify-end"
    size={Layout.Size.MEDIUM}
    align={Layout.Align.END}
    split={<Divider type={Layout.Direction.HORIZONTAL} />}
  >
    {children}
  </Space>
);

export default TableActions;
