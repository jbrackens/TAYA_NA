import { Input, Button } from "antd";
import styled from "styled-components";

const BUTTON_SIZE = 90;
const MARGIN_SIZE = 4;

export const FilterInput = styled(Input)`
  display: block;
  width: ${2 * (BUTTON_SIZE + MARGIN_SIZE)}px;
  margin-bottom: ${2 * MARGIN_SIZE}px;
`;

export const FilterButton = styled(Button)`
  width: ${BUTTON_SIZE}px;
`;
