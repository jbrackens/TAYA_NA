import React, { ReactNode } from "react";
import { CoreButtontProps } from "../button";
import { BaseModal } from "./index.styled";

type CoreModalProps = {
  className?: string;
  visible?: boolean;
  title?: React.ReactNode;
  closable?: boolean;
  onOk?: (...args: any[]) => any;
  onCancel?: (...args: any[]) => any;
  afterClose?: () => void;
  okButtonProps?: CoreButtontProps;
  cancelButtonProps?: CoreButtontProps;
  centered?: boolean;
  width?: string | number;
  okText?: React.ReactNode;
  okType?: any;
  cancelText?: React.ReactNode;
  mask?: boolean;
  maskClosable?: boolean;
  zIndex?: number;
  style?: React.CSSProperties;
  maskStyle?: React.CSSProperties;
  keyboard?: boolean;
  getContainer?: string | HTMLElement | false;
  transitionName?: string;
  maskTransitionName?: string;
  bodyStyle?: React.CSSProperties;
  closeIcon?: React.ReactNode;
  modalRender?: (node: React.ReactNode) => React.ReactNode;
  focusTriggerAfterClose?: boolean;
  footer?: ReactNode;
  forceRender?: boolean;
  children?: React.ReactNode;
};

export const CoreModal: React.FC<CoreModalProps> = ({
  className,
  visible,
  title,
  closable,
  onOk,
  onCancel,
  afterClose,
  okButtonProps,
  cancelButtonProps,
  centered,
  width,
  okText,
  okType,
  cancelText,
  mask,
  maskClosable,
  zIndex,
  style,
  maskStyle,
  keyboard,
  getContainer,
  transitionName,
  maskTransitionName,
  bodyStyle,
  closeIcon,
  modalRender,
  focusTriggerAfterClose,
  children,
  footer,
  forceRender,
}) => {
  return (
    <BaseModal
      className={className}
      visible={visible}
      title={title}
      closable={closable}
      onOk={onOk}
      onCancel={onCancel}
      afterClose={afterClose}
      okButtonProps={okButtonProps}
      cancelButtonProps={cancelButtonProps}
      centered={centered}
      width={width}
      okText={okText}
      okType={okType}
      cancelText={cancelText}
      mask={mask}
      maskClosable={maskClosable}
      zIndex={zIndex}
      style={style}
      maskStyle={maskStyle}
      keyboard={keyboard}
      getContainer={getContainer}
      transitionName={transitionName}
      maskTransitionName={maskTransitionName}
      bodyStyle={bodyStyle}
      closeIcon={closeIcon}
      modalRender={modalRender}
      focusTriggerAfterClose={focusTriggerAfterClose}
      footer={footer}
      forceRender={forceRender}
    >
      {children}
    </BaseModal>
  );
};
