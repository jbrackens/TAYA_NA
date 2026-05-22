import type { SpaceProps } from "antd";
import styled from "styled-components";
import { Space } from "antd";
import type { ComponentType, ComponentProps } from "react";

const Space19 = Space as ComponentType<ComponentProps<typeof Space>>;

export const SpaceStyled = styled(Space19)<SpaceProps>`
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;
