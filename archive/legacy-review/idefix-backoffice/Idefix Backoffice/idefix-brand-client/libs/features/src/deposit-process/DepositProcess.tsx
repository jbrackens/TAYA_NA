import * as React from "react";
import { useDepositProcess } from "./useDepositProcess";
import styled from "styled-components";
import { useRegistry } from "@brandserver-client/ui";
import { useMessages } from "@brandserver-client/hooks";

const StyledDepositProcess = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .deposit-process__loader {
    width: 116px;
    height: 116px;
  }

  .deposit-process__title {
    ${({ theme }) => theme.typography.text21BoldUpper};

    margin-top: 26px;
    color: ${({ theme }) => theme.palette.contrast};
  }
`;

interface Props {
  id?: string;
  status?: "pending" | "failed" | "complete";
}

const DepositProcess: React.FC<Props> = ({ id, status }) => {
  useDepositProcess(id!, status);

  const { Loader } = useRegistry();
  const messages = useMessages({
    title: "my-account.deposit.processing"
  });

  return (
    <StyledDepositProcess>
      <Loader className="deposit-process__loader" />
      <div className="deposit-process__title">{messages.title}</div>
    </StyledDepositProcess>
  );
};

export default DepositProcess;
