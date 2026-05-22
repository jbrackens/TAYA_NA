import styled from "styled-components";
import { Button } from "antd";
import type { ComponentType, ComponentProps } from "react";

const Button19 = Button as ComponentType<ComponentProps<typeof Button>>;

export const MoreButton = styled(Button19)`
  padding-left: 0.5rem;
  padding-right: 0.5rem;
`;
