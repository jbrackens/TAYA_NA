import { ReactNode } from "react";
import { Space, Spin, Typography } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import type { SpinProps } from "antd";
import { Layout } from "@taptrade-ui/utils/dist/types/layout";

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
      indicator={<LoadingOutlined className="text-2xl" spin />}
    />
  );

  const wrapWithOverlay = (component: ReactNode) => (
    <Space className="absolute inset-0 z-[1] flex flex-row items-center justify-center bg-white/95">
      {component}
    </Space>
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
