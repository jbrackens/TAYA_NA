import { Divider } from "antd";
import type { DividerProps } from "antd";
import styled from "styled-components";

export const Wrapper = styled.div`
  margin-top: 2rem;
`;

export const WrapperDivider = styled(Divider)<DividerProps>`
  margin-top: 2rem;
  margin-bottom: 0;
`;
