import { css } from "styled-components";

export const ScrollbarStyle = css`
  overflow-x: hidden;
  overflow-y: scroll;
  scrollbar-width: thin;
  scrollbar-color: ${(props) => props.theme.layout.scrollbarColor};
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 15px;
  }
  &::-webkit-scrollbar-corner {
    background-color: transparent;
  }
  &:hover {
    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.layout.scrollbarColor};
      &:hover {
        background: ${(props) => props.theme.layout.scrollbarHoverColor};
      }
    }
  }
`;

export const ScrollbarStyleExtraRight = css`
  border-right: 6px solid transparent;
  ${ScrollbarStyle}
`;
