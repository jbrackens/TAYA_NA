import React, { useState, useEffect } from "react";
import {
  StyledResultComponent,
  StyledResultComponentProps,
} from "../../results";
import { Button } from "antd";
import { ResultModal } from "./index.styled";

type ResultModalComponent = {
  onOk?: () => void;
  okText: string;
  onCancel?: () => void;
  cancelText?: string;
  isVisible: boolean;
} & StyledResultComponentProps;

const ResultModalComponent: React.FC<ResultModalComponent> = ({
  status,
  title,
  subTitle,
  onOk,
  okText,
  isVisible,
  onCancel,
  cancelText,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    setIsModalVisible(isVisible);
  }, [isVisible]);

  const onOkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOk && onOk();
    setIsModalVisible(false);
  };

  const onCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel && onCancel();
    setIsModalVisible(false);
  };

  const buttons = [
    <Button type="primary" key="1" onClick={onOkClick}>
      {okText}
    </Button>,
    ...(cancelText
      ? [
          <Button type="primary" key="2" onClick={onCancelClick}>
            {cancelText}
          </Button>,
        ]
      : []),
  ];

  return (
    <ResultModal visible={isModalVisible}>
      <StyledResultComponent
        status={status}
        title={title}
        subTitle={subTitle}
        extra={buttons}
      />
    </ResultModal>
  );
};

export { ResultModalComponent };
