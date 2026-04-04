import styled from "styled-components";

export const TabsWrapper = styled.div`
  width: 100%;
  display: flex;
  box-sizing: border-box;
  border-bottom: 1px solid
    ${(props) => props.theme.uiComponents.tabs.tabBottomBorder};
  align-items: stretch;
  justify-content: center;
  align-content: center;
`;

type TabsItemProps = {
  $selected?: boolean;
  $clickable?: boolean;
};
export const TabsItem = styled.a<TabsItemProps>`
  flex-grow: 1;
  flex-basis: 0;
  text-align: center;
  color: ${(props) =>
    props.$selected
      ? props.theme.uiComponents.tabs.tabColorSelect
      : props.theme.uiComponents.tabs.tabColor};
  cursor: ${(props) => (props.$clickable ? "pointer" : "auto")};
  background-color: inherit;
  padding: 20px 5px;
  display: flex;
  justify-content: center;
  align-content: center;
  flex-direction: column;
  &:hover {
    color: ${(props) =>
      props.$selected
        ? props.theme.uiComponents.tabs.tabColorSelect
        : props.theme.uiComponents.tabs.tabColor};
    ${(props) =>
      props.$clickable && {
        "background-color": props.theme.uiComponents.tabs.hoverColor,
      }}
  }
`;

type BorderProps = {
  opLength: number;
  currentIndex: number;
};
export const SelectedBorder = styled.hr<BorderProps>`
  display: ${(props) =>
    props.currentIndex < 0 || props.currentIndex > props.opLength - 1
      ? "none"
      : "block"};
  width: ${(props) => 100 / props.opLength}%;
  margin: 0;
  height: 1px;
  border: 0;
  background: ${(props) => props.theme.uiComponents.tabs.selectBorder};
  margin-left: ${(props) => (100 / props.opLength) * props.currentIndex}%;
  transition: 0.3s ease-in-out;
`;
