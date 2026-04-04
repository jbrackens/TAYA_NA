import styled from "styled-components";
import { Button } from "ui";

export const ButtonDiv = styled.div`
  text-align: right;
  button {
    margin-right: 0;
  }
`;

export const ButtonDivSpaceAbove = styled.div`
  margin-top: 20px;
`;

export const InputWithButtonField = styled.div`
  display: flex;
  width: 100%;
  > div:first-child {
    flex-grow: 1;
  }
`;

export const InputButton = styled(Button)`
  margin-left: 10px;
`;
