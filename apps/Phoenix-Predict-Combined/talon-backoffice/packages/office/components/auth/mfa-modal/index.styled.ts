import { Row } from "antd";
import styled from "styled-components";
import type { ComponentType, ComponentProps } from "react";

const Row19 = Row as ComponentType<ComponentProps<typeof Row>>;

export const ErrorRow = styled(Row19)`
  margin-bottom: 10px;
`;
