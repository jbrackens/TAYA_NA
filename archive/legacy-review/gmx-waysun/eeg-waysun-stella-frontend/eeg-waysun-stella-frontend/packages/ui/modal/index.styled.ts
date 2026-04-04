import styled from "styled-components";

type ModalProps = {
  $display1?: boolean;
  $display2?: boolean;
  $fullWidth?: boolean;
  $contentPadding?: number;
  $scrollable?: boolean;
};
export const ModalWrapper = styled.div<ModalProps>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: auto;
  outline: 0;
  -webkit-overflow-scrolling: touch;
  opacity: ${(props) => (props.$display1 ? "1" : "0")};
  transition: opacity 0.5s;
  ${(props) => props.$display2 && { display: "none" }};
  z-index: 1000;
`;

export const ModalBackground = styled.div<ModalProps>`
  background-color: ${(props) =>
    props.theme.uiComponents.modal.blackBackground};
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  height: 100%;
  opacity: ${(props) => (props.$display1 ? "1" : "0")};
  transition: opacity 0.5s;
  ${(props) => props.$display2 && { display: "none" }};
`;

export const ModalContainer = styled.div<ModalProps>`
  box-sizing: border-box;
  transform-origin: 0px 0px;
  color: white;
  transition: 0.3s;
  text-align: center;
  padding: ${(props) => props.$contentPadding}px;
  min-width: ${(props) => (props.$fullWidth ? "auto" : "500px")};
  min-height: ${(props) => (props.$fullWidth ? "auto" : "200px")};
  max-width: ${(props) => (props.$fullWidth ? "inherit" : "800px")};
  background-color: ${(props) =>
    props.theme.uiComponents.modal.modalBackground};
  border-radius: 20px;
  display: inline-block;
  position: absolute;
  top: ${(props) => (props.$scrollable ? "10%" : "50%")};
  left: 50%;
  transform: scale(${(props) => (props.$display1 ? "1" : "0")})
    translate(-50%, ${(props) => (props.$scrollable ? "0" : "-60%")});
  z-index: 1001;
  overflow-wrap: break-word;
  overflow: auto;
  ${(props) =>
    props.$fullWidth && {
      width: "100%",
    }}
  @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
    min-width: auto;
    max-width: none;
    width: 100%;
  }
`;

export const CloseButtonContainer = styled.div<ModalProps>`
  position: absolute;
  right: 0;
  top: 0;
  padding: 7px;
  color: ${(props) => props.theme.uiComponents.modal.closeButtonColor};
  margin-right: 5px;
`;

export const Children = styled.div``;
