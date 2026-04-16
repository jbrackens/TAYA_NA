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
  background: #ffffff;
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
