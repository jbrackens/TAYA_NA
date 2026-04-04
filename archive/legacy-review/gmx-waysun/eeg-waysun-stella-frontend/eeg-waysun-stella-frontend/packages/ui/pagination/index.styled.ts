import styled from "styled-components";

type PaginationProps = {
  fullWidth?: boolean;
};

export const PaginationContainer = styled.div<PaginationProps>`
  width: 100%;
  color: white;
  display: flex;
  justify-content: ${(props) => (props.fullWidth ? "center" : "initial")};
  text-align: center;
  align-items: center;
`;

export const Arrows = styled.a`
  flex-grow: 0;
  cursor: pointer;
`;

export const PageNumbersContainer = styled.div<PaginationProps>`
  flex-grow: ${(props) => (props.fullWidth ? 1 : 0)};
  display: flex;
  margin: 0 13px;
  justify-content: center;
`;

type PageNumbersProps = {
  current?: boolean;
};
export const PageNumbers = styled.button<PageNumbersProps>`
  user-select: none;
  font-size: 16px;
  margin: 0 3px;
  font-weight: 600;
  color: ${(props) => props.theme.uiComponents.pagination.textColor};
  background-color: ${(props) =>
    props.current
      ? props.theme.uiComponents.pagination.selectedColor
      : props.theme.uiComponents.pagination.normalColor};
  border-radius: 50%;
  border: none;
  cursor: pointer;
  height: 0;
  width: 35px;
  padding-bottom: 35px;
  position: relative;
  div {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

export const DotDiv = styled.div`
  user-select: none;
  align-self: flex-end;
`;
