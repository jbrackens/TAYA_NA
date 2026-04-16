import styled from "styled-components";
import { CoreForm } from "../../../ui/form";
import { CoreSelect } from "../../../ui/select";

export const CustomSelect = styled(CoreSelect)`
  width: ${(props) => 6.5 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;
  align-self: center;
`;

export const CustomFormForLanguageSelector = styled(CoreForm)`
  padding: 0;
  align-self: center;
  width: ${(props) => 6 * props.theme.baseGutter}px;
  margin-right: ${(props) => 1.5 * props.theme.baseGutter}px;

  & .ant-select-selector {
    border: 1px solid
      ${(props) => props.theme.menu.languageSelector.borderColor} !important;
  }
  & .ant-select-arrow {
    color: ${(props) =>
      props.theme.menu.languageSelector.arrowColor} !important;
    & .anticon {
      opacity: 1 !important;
    }
  }

  ${CoreSelect.OptionContent} {
    color: ${(props) => props.theme.menu.languageSelector.fontColor} !important;
  }
`;
