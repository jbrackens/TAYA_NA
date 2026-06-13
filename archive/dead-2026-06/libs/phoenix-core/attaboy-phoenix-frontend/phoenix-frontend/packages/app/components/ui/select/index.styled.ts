import { Select } from "antd";
import styled from "styled-components";
import { CustomChevronComponent } from "./custom-chevron";

export const StyledOptionContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: ${(props) =>
    props.theme.uiComponents.select.backgroundColor};
  color: ${(props) => props.theme.uiComponents.select.fontColor};
  width: 100%;
  height: 100%;
  padding-left: 10px;
  padding-top: 5px;
  border-radius: 5px;
  &:hover {
    background-color: ${(props) =>
      props.theme.uiComponents.select.hoverBackgroundColor};
  }
`;

export const CustomChevron = styled.img`
  width: ${(props) => 1 * props.theme.baseGutter}px;
  height: ${(props) => 1 * props.theme.baseGutter}px;
  vertical-align: top;
`;

export const BaseSelect = styled(Select).attrs(() => ({
  suffixIcon: CustomChevronComponent,
  dropdownStyle: {
    backgroundColor: "transparent",
  },
}))`
  width: 100%;
  ${StyledOptionContent} {
    padding: 0;
    padding-left: 5px;
    display: flex;
    align-items: center;
    &:hover {
      color: ${(props) => props.theme.uiComponents.select.fontColor};
    }
  }

  & .ant-select-arrow {
    color: ${(props) => props.theme.uiComponents.select.fontColor};
    top: 55%;
  }
`;
