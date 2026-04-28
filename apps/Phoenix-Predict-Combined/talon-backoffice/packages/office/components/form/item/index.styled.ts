import styled from "styled-components";
import { Form } from "antd";
import { FormItemProps } from "antd/lib/form";

export const FormItemPreview = styled(Form.Item)<FormItemProps>`
  &:last-child {
    margin-bottom: 0;
  }

  .ant-form-item-label {
    position: relative;
    z-index: 0;

    label {
      padding-right: 1rem;

      font-style: italic;

      background: var(--surface-1, #ffffff);

      position: static;

      &:after {
        display: block;
        content: "";
        width: 100%;
        height: 1px;
        margin-top: calc(-4px);

        position: absolute;
        top: 50%;
        left: 0;
        z-index: -1;

        background: rgba(0, 0, 0, 0.075);
      }
    }
  }
`;
