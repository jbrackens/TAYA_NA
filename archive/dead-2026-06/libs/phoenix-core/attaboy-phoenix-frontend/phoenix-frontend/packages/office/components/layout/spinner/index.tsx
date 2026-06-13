import React, { ReactNode } from "react";
import { Space, Spin, Typography } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { SpinProps } from "antd/lib/spin";
import { Layout } from "@phoenix-ui/utils";
import { Wrapper } from "./index.styled";

const { Text } = Typography;

export type SpinnerProps = SpinProps & {
  label?: string;
  inline?: boolean;
  overlay?: boolean;
};

const Spinner = ({ inline, label, overlay, ...props }: SpinnerProps) => {
  const spin = (
    <Spin
      {...props}
      indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
    />
  );

  const wrapWithOverlay = (component: ReactNode) => (
    <Wrapper>{component}</Wrapper>
  );

  if (label) {
    const labeledSpin = (
      <Space
        direction={
          inline ? Layout.Direction.HORIZONTAL : Layout.Direction.VERTICAL
        }
        align={inline ? Layout.Align.START : Layout.Align.CENTER}
      >
        {spin} <Text type="secondary">{label}</Text>
      </Space>
    );
    return overlay ? wrapWithOverlay(labeledSpin) : labeledSpin;
  }

  return overlay ? wrapWithOverlay(spin) : spin;
};

export default Spinner;
