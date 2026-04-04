import { FC, useEffect, useState } from "react";
import {
  ModalWrapper,
  ModalContainer,
  ModalBackground,
  CloseButtonContainer,
  Children,
} from "./index.styled";
import { Button, Header } from "./..";
import { CloseOutlined } from "@ant-design/icons";

type ModalProps = {
  display?: boolean;
  closeButtonOnTop?: boolean;
  onCloseButtonClicked?: (e: any) => void;
  onClickedOutside?: (e: any) => void;
  fullWidth?: boolean;
  modalheader?: string;
  contentPadding?: number;
  scrollable?: boolean;
};

export const Modal: FC<ModalProps> = ({
  children,
  display = false,
  closeButtonOnTop = true,
  onCloseButtonClicked,
  onClickedOutside,
  fullWidth = false,
  modalheader = "",
  contentPadding = 40,
  scrollable = false,
}) => {
  const [displayComponent1, setDisplayComponent1] = useState<boolean>();
  const [displayComponent2, setDisplayComponent2] = useState<boolean>();

  useEffect(() => {
    if (!display) {
      setDisplayComponent1(display);
      setTimeout(() => setDisplayComponent2(display), 100);
    } else {
      setDisplayComponent2(display);
      setTimeout(() => setDisplayComponent1(display), 100);
    }
  }, [display]);

  const backgroundClicked = (e: any) => {
    onClickedOutside && onClickedOutside(e);
  };

  return (
    <>
      <ModalWrapper
        $display1={displayComponent1}
        $display2={!displayComponent2}
      >
        <ModalBackground
          $display1={displayComponent1}
          $display2={!displayComponent2}
          onClick={backgroundClicked}
        />
        <ModalContainer
          $display1={displayComponent1}
          $fullWidth={fullWidth}
          $contentPadding={contentPadding}
          $scrollable={scrollable}
        >
          {closeButtonOnTop && (
            <CloseButtonContainer>
              <Button
                buttonType="nobackground"
                onClick={onCloseButtonClicked}
                compact
              >
                <CloseOutlined />
              </Button>
            </CloseButtonContainer>
          )}
          {modalheader.length > 0 && (
            <Header customFontSize={26} size="medium">
              {modalheader}
            </Header>
          )}
          <Children>{children}</Children>
        </ModalContainer>
      </ModalWrapper>
    </>
  );
};
