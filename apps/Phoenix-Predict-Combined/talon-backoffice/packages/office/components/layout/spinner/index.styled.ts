import type { SpaceProps } from "antd";
import { Space } from "antd";
import styled from "styled-components";
import type { ComponentType, ComponentProps } from "react";

const Space19 = Space as ComponentType<ComponentProps<typeof Space>>;

export const Wrapper = styled(Space19)<SpaceProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;

  background: rgba(255, 255, 255, 0.95);
`;
