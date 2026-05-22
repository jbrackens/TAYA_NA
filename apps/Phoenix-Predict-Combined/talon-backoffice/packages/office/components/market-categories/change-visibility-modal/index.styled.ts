import { Alert } from "antd";
import styled from "styled-components";
import type { ComponentType, ComponentProps } from "react";

const Alert19 = Alert as ComponentType<ComponentProps<typeof Alert>>;

export const ModalContent = styled.span`
  margin-right: 10px;
`;

export const StyledAlert = styled(Alert19)`
  margin: 10px 0;
`;
