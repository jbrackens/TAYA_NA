import { Input, Button } from "antd";
import styled from "styled-components";
import type { ComponentType, ComponentProps } from "react";

const Input19 = Input as ComponentType<ComponentProps<typeof Input>>;
const Button19 = Button as ComponentType<ComponentProps<typeof Button>>;

const BUTTON_SIZE = 90;
const MARGIN_SIZE = 4;

export const FilterInput = styled(Input19)`
  display: block;
  width: ${2 * (BUTTON_SIZE + MARGIN_SIZE)}px;
  margin-bottom: ${2 * MARGIN_SIZE}px;
`;

export const FilterButton = styled(Button19)`
  width: ${BUTTON_SIZE}px;
`;
