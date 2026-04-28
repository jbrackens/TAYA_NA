import styled from "styled-components";
import { Form } from "antd";

export const LoginWrapper = styled.div`
  display: flex;
  height: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const LoginFormComponent = styled.div`
  width: 32rem;
  background: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 16px;
  box-shadow:
    0 12px 48px rgba(26, 26, 26, 0.06),
    0 1px 2px rgba(26, 26, 26, 0.04);
`;

export const LoginForm = styled.div`
  padding: 1.5rem;
  position: relative;
`;

export const StyledA = styled.a`
  padding-left: 28px;
`;

export const StyledLabel = styled.label`
  padding-left: 7px;
`;

export const FormItemWithSmallerMarginBottom: typeof Form.Item = styled(
  Form.Item,
)`
  margin-bottom: 5px;
`;
