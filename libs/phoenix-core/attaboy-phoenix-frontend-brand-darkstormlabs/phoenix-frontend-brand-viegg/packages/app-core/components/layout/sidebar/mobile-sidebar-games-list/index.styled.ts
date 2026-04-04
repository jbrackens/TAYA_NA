import styled from "styled-components";

type MobileSiderProps = {
  $isGamesListVisible: boolean;
};

export const MobileSider = styled.div<MobileSiderProps>`
  height: 100%;
  background-color: ${(props) => props.theme.sidebar.backgroundColor};
  @media (min-width: 1200px) {
    width: 0px;
    display: none;
  }
  display: block;
  position: fixed;
  background-color: white;
  top: 0px;
  left: 0;
  z-index: 999;
  width: ${(props) => (props.$isGamesListVisible ? "230px" : "0px")};
  transition: width 0.35s ease-in-out;
`;

export const SliderMask = styled.div<MobileSiderProps>`
  @media (min-width: 1200px) {
    display: none;
  }
  position: ${(props) => (props.$isGamesListVisible ? "fixed" : "")};
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  opacity: 0.8;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;
