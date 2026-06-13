import styled from "styled-components";
import { Card, Divider } from "antd";

export const CardWithMarginBottom: typeof Card = styled(Card)`
  margin-bottom: 20px;
`;

export const FullWidthContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const SmallerMarginDivider = styled(Divider)`
  margin: 15px 0;
`;
