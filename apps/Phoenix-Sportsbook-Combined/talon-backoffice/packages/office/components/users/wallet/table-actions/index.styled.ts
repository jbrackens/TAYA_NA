import { Button } from "antd";
import styled from "styled-components";

export const ActionButtonContainer = styled.div`
  button:first-child {
    margin-bottom: 5px;
  }
  button {
    width: 100%;
  }
`;

export const CancelButton = styled(Button)`
  margin-left: 10px;
`;
