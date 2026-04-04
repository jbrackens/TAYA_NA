import styled from "styled-components";

type ToastContainerProp = {
  $show: boolean;
};
export const ToastContainer = styled.div<ToastContainerProp>`
  position: fixed;
  top: ${(props) => (props.$show ? "30px" : "-50px")};
  left: 50%;
  transform: translate(-50%, 0);
  color: #252525;
  padding: 10px 20px;
  background-color: #ffffff;
  display: flex;
  opacity: ${(props) => (props.$show ? 1 : 0)};
  transition: all 0.2s ease-in;
  z-index: 100;
  border-radius: 7px;
  font-size: 14px;
`;

type IconProps = {
  $type: string;
};
export const IconContainer = styled.div<IconProps>`
  color: ${(props) => {
    switch (props.$type) {
      case "success":
        return "#00ab11";
      case "error":
        return "#f22121";
      default:
        return "#3f8cff";
    }
  }};
  margin-right: 10px;
  height: 0;
  svg {
    height: 21px;
    width: 21px;
  }
`;
