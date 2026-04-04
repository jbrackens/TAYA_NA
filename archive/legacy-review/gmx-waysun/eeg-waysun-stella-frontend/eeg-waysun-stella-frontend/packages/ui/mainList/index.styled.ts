import styled from "styled-components";
import { ScrollbarStyle } from "./..";

export const MainListUl = styled.ul`
  padding: 1px;
  margin: 0;
  list-style-type: none;
  ${ScrollbarStyle}
  li {
    margin-bottom: 10px;
  }
`;

type MainListItemStyleProps = {
  $fullWidth?: boolean;
  $clickable?: boolean;
  $selected?: boolean;
};
export const MainListItemStyle = styled.div<MainListItemStyleProps>`
  position: relative;
  padding: 23px 30px 23px 25px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  background-color: ${(props) =>
    props.$selected
      ? props.theme.uiComponents.mainList.listItemBackgroundSelected
      : props.theme.uiComponents.mainList.listItemBackground};
  border-radius: 10px;
  color: ${(props) => props.theme.uiComponents.mainList.fontColor};
  max-width: ${(props) => (props.$fullWidth ? "100%" : "200px")};
  cursor: ${(props) => (props.$clickable ? "pointer" : "auto")};
  &:hover {
    outline: ${(props) =>
      props.$clickable
        ? `1px solid ${props.theme.uiComponents.mainList.outline}`
        : "0px"};
  }
  a {
    color: ${(props) => props.theme.uiComponents.mainList.fontColor};
    &:hover {
      color: ${(props) => props.theme.uiComponents.mainList.fontColor};
      text-decoration: none;
    }
  }
  ${(props) =>
    props.$selected && {
      "box-shadow": "inset 0 1px 0 0 rgba(75, 75, 75, 0.25)",
    }};
`;

type VariantDivProps = {
  $variant?: "positive" | "negative" | "none";
};
export const VariantDiv = styled.div<VariantDivProps>`
  width: 9px;
  height: 9px;
  background-color: ${(props) =>
    props.$variant === "positive"
      ? props.theme.uiComponents.mainList.positive
      : props.$variant === "negative"
      ? props.theme.uiComponents.mainList.negative
      : "transparent"};
  border-radius: 50%;
  position: absolute;
  box-shadow: 0 1px 8px 0
    ${(props) =>
      props.$variant === "positive"
        ? props.theme.uiComponents.mainList.positiveShadow
        : props.$variant === "negative"
        ? props.theme.uiComponents.mainList.negative
        : "transparent"};
  right: 10px;
  top: 15px;
  ${(props) =>
    props.$variant === "none" && {
      visibility: "hidden",
    }};
`;

type MainListItemAProps = {
  $loading?: boolean;
};
export const MainListItemA = styled.a<MainListItemAProps>`
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  ${(props) =>
    props.$loading && {
      visibility: "hidden",
    }};
`;

export const LoaderDiv = styled.div`
  position: absolute;
  width: 100%;
  top: 50%;
  transform: translate(0, -50%);
`;
