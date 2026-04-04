import { useTranslation } from "next-export-i18n";
import React, { FC } from "react";
import { Button, Modal } from "ui";
import { DeleteModalheader, DeleteModalError } from "./index.styled";
import { DeleteOutlined } from "@ant-design/icons";

type DeleteModalProps = {
  isVisbile: boolean;
  onCloseButtonClick: () => void;
  onOutsideClick: () => void;
  onCancelClick: () => void;
  onConfirmClick: () => void;
  loading?: boolean;
  error?: string;
};

export const DeleteModal: FC<DeleteModalProps> = ({
  isVisbile,
  onCloseButtonClick,
  onOutsideClick,
  onCancelClick,
  onConfirmClick,
  loading = false,
  error = "",
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      display={isVisbile}
      onCloseButtonClicked={onCloseButtonClick}
      onClickedOutside={onOutsideClick}
    >
      <>
        <DeleteModalheader>{t("DELETE_MODAL_TITLE")}</DeleteModalheader>
        <Button buttonType="default" onClick={onCancelClick}>
          {t("CANCEL")}
        </Button>
        <Button
          onClick={onConfirmClick}
          buttonType="danger"
          icon={<DeleteOutlined />}
          loading={loading}
        >
          {t("DELETE")}
        </Button>
        <DeleteModalError>{t(error)}</DeleteModalError>
      </>
    </Modal>
  );
};
