import React, { ReactNode } from "react";
import { Button as ButtonEnum } from "@phoenix-ui/utils";
import { Button, Modal as ModalComponent } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "i18n";

export type ModalActionLabels = {
  cancel?: string;
  submit?: string;
};

export type ModalProps = {
  title: string;
  children: ReactNode;
  visible: boolean;
  loading?: boolean;
  footer?: any[];
  labels?: ModalActionLabels;
  onCancel?: Function;
  onSubmit?: Function;
};

const Modal: React.FC<ModalProps> = ({
  title,
  children,
  visible,
  loading,
  footer,
  labels,
  onCancel,
  onSubmit,
}: ModalProps) => {
  const { t } = useTranslation("common");

  const footerActions = footer || [];
  if (!footer && (onCancel || onSubmit)) {
    if (onCancel) {
      footerActions.push(
        <Button
          key="back"
          data-testid="modal-footer-button-cancel"
          shape={ButtonEnum.Shape.ROUND}
          onClick={() => onCancel()}
          icon={<CloseOutlined />}
        >
          {labels?.cancel || t("CANCEL")}
        </Button>,
      );
    }
    if (onSubmit) {
      footerActions.push(
        <Button
          key="submit"
          data-testid="modal-footer-button-submit"
          type={ButtonEnum.Type.PRIMARY}
          shape={ButtonEnum.Shape.ROUND}
          icon={<CheckOutlined />}
          loading={loading}
          onClick={() => onSubmit()}
        >
          {labels?.submit || t("SUBMIT")}
        </Button>,
      );
    }
  }

  return (
    <ModalComponent
      title={title}
      centered
      visible={visible}
      onCancel={() => onCancel && onCancel()}
      footer={footerActions}
    >
      {children}
    </ModalComponent>
  );
};

export default Modal;
