import * as React from "react";
import styled from "styled-components";

import { useOnClickOutside } from "../../hooks";
import { FullTrash } from "../../icons";
import { Button } from "../Button";

const StyledConfirmationDialog = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: ${({ theme }) => theme.zIndex.dialog};
  overflow: auto;
  background-color: ${({ theme }) => theme.palette.blackDark};

  .dialog-content {
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: auto;
    padding: 32px;
    width: 268px;
    height: 198px;
    background-color: #f5f5f5;
    box-shadow: ${({ theme }) => theme.shadows.shadow1};
    border-radius: 16px;
    animation-name: animateOpen;
    animation-duration: 0.4s;
  }

  .dialog__description {
    text-align: center;
    margin-top: 6px;
  }

  .dialog__actions {
    align-self: stretch;
    margin-top: 16px;
  }

  .actions {
    display: flex;
    justify-content: space-between;

    &__delete {
      background-color: ${({ theme }) => theme.palette.red};
      padding: 6px 26px;
      color: ${({ theme }) => theme.palette.white};
    }

    &__cancel {
      padding: 6px 26px;
    }
  }

  @keyframes animateOpen {
    from {
      top: -300px;
      opacity: 0;
    }
    to {
      top: 50%;
      opacity: 1;
    }
  }
`;

type ContextType = (() => Promise<void>) | undefined;

const Context = React.createContext<ContextType>(undefined);
Context.displayName = "ConfirmDialogContext";

interface ConfirmationDialogProps {
  open: boolean;
  onDelete?: () => void;
  onClose: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ open, onDelete, onClose }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useOnClickOutside(ref, onClose);

  return open ? (
    <StyledConfirmationDialog>
      <div className="dialog-content" ref={ref}>
        <FullTrash className="dialog__icon" />
        <p className="dialog__description text-header-small">
          Are you sure you <br /> want to delete?
        </p>
        <div className="dialog__actions actions">
          <Button className="actions__delete" onClick={onDelete} data-testid="confirm-delete">
            Delete
          </Button>
          <Button className="actions__cancel" appearance="flat" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </StyledConfirmationDialog>
  ) : null;
};

const ConfirmDialogProvider: React.FC = props => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const awaitingPromiseRef = React.useRef<{
    resolve: () => void;
    reject: () => void;
  }>();

  const openConfirmationDialog = React.useCallback(() => {
    setIsOpen(true);
    return new Promise<void>((resolve, reject) => {
      awaitingPromiseRef.current = { resolve, reject };
    });
  }, []);

  const handleClose = React.useCallback(() => {
    if (awaitingPromiseRef.current) {
      awaitingPromiseRef.current.reject();
    }
    setIsOpen(false);
  }, []);

  const handleDelete = React.useCallback(() => {
    if (awaitingPromiseRef.current) {
      awaitingPromiseRef.current.resolve();
    }
    setIsOpen(false);
  }, []);

  return (
    <>
      <Context.Provider value={openConfirmationDialog} {...props} />
      <ConfirmationDialog open={isOpen} onClose={handleClose} onDelete={handleDelete} />
    </>
  );
};

const useConfirmationDialog = () => {
  const context = React.useContext(Context);
  if (context === undefined) {
    throw new Error("useConfirmationDialog must be used within ConfirmDialogProvider");
  }
  return context;
};

export { ConfirmationDialog, ConfirmDialogProvider, useConfirmationDialog };
