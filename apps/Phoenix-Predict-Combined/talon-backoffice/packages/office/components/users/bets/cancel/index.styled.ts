import styled from "styled-components";
import { Alert } from "antd";
import type { ComponentType, ComponentProps } from "react";

const Alert19 = Alert as ComponentType<ComponentProps<typeof Alert>>;

export const StyledAlert = styled(Alert19)`
  margin-top: 10px;
  margin-bottom: 10px;
`;
