import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { useRegistry } from "../../useRegistry";
import { Breakpoints } from "../../breakpoints";

const StyledInlineModal = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${({ theme }) => theme.zIndex.modal};

  .inline-modal__card {
    border-radius: 0;
    margin: 0;
    width: 100vw;
    height: 100%;
    overflow-y: scroll;
    display: flex;
    justify-content: center;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding: 15px 25px 0 21px;
    }
  }
`;

export interface InlineModalProps {
  children: React.ReactElement;
  className?: string;
}

const InlineModal: React.FC<InlineModalProps> = ({ children, className }) => {
  const { Card } = useRegistry();
  const modal = (
    <StyledInlineModal className={className}>
      <Card className="inline-modal__card">{children}</Card>
    </StyledInlineModal>
  );

  const container = document.querySelector("#modal-container");
  return <>{container && createPortal(modal, container)}</>;
};

export { InlineModal };
