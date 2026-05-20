import type { SpaceProps } from "antd";
import styled from "styled-components";
import { Space } from "antd";

export const SpaceStyled = styled(Space)<SpaceProps>`
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;
