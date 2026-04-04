import React, { useRef } from "react";
import { useOutsideClick } from "@brandserver-client/hooks";
import { Breakpoints } from "../../breakpoints";
import styled from "styled-components";
import { useRegistry } from "../../useRegistry";

const StyledModal = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${({ theme }) => theme.zIndex.modal};
  background-color: rgba(0, 0, 0, 0.2);

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.mobile)} {
    .modal__content {
      width: 100%;
      height: 100%;
    }
    .modal__card {
      overflow-y: scroll;
    }
  }

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    .modal__card {
      display: flex;
      border-radius: 0;
      margin: 0;
      width: 100vw;
      flex: 1;
      overflow-y: scroll;
      padding: 65px 25px 0 21px;
    }
  }
`;

export interface ModalProps {
  children: React.ReactElement;
  onClose: () => any;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  const modalContentRef = useRef(null);
  useOutsideClick(modalContentRef, onClose);

  const { Card } = useRegistry();

  return (
    <StyledModal>
      <div ref={modalContentRef} className="modal__content">
        <Card className="modal__card">{children}</Card>
      </div>
    </StyledModal>
  );
};

export { Modal };
