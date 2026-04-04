import styled from "styled-components";
import { CoreForm } from "../../../ui/form";

export const FormForLimts = styled(CoreForm)`
  padding-right: ${(props) => 1 * props.theme.baseGutter}px;
  padding-left: ${(props) => 1 * props.theme.baseGutter}px;
  padding-bottom: 0;
  padding-top: 0;
`;
