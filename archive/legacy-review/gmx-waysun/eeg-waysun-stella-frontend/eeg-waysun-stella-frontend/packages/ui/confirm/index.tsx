import { FC } from "react";
import { Modal, Button } from "ui";
import { useTranslation } from "next-export-i18n";

type ConfirmModalProps = {
  show: boolean;
  close: () => void;
  onConfirm: () => void;
  header?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
};

export const ConfirmModal: FC<ConfirmModalProps> = ({
  show,
  close,
  header = "Confirm",
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onConfirm,
  loading = false,
}) => {
  return (
    <>
      <Modal modalheader={header} display={show} onCloseButtonClicked={close}>
        <Button buttonType="white-outline" onClick={close}>
          {cancelLabel}
        </Button>
        <Button buttonType="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </Modal>
    </>
  );
};
