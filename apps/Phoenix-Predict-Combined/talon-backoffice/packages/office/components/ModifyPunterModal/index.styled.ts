import styled from "styled-components";
import { Form } from "antd";

export const CustomFormItem = styled(Form.Item)`
  text-align: right;
  margin-top: 20px;
  button {
    margin-left: 10px;
  }
`;

type FormFieldWrapperProps = {
  $horizontalLayout: boolean;
};

export const FormFieldWrapper = styled.div<FormFieldWrapperProps>`
  display: ${(props) => (props.$horizontalLayout ? "flex" : "block")};
  .ant-form-item {
    flex-grow: 1;
    margin-right: ${(props) => (props.$horizontalLayout ? "10px" : "0")};
  }
`;

export const ErrorMessageDiv = styled.div`
  float: left;
  color: var(--no-text, #a8472d);
`;
