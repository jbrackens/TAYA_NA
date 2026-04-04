import styled from "styled-components";
import { CoreModal } from "../../ui/modal";
import { CoreButton } from "../../ui/button";

export const TermsStyledModal = styled(CoreModal)`
  .ant-modal-body {
    flex-direction: column;
    @media (max-width: 1200px) {
      padding: ${(props) => 2 * props.theme.baseGutter}px;
    }
  }
`;

export const InlineCoreButton = styled(CoreButton)`
  display: inline;
`;

export const ContentContainer = styled.div`
  color: ${(props) => props.theme.content.mainFontColor};
  width: 100%;
  max-height: 50vh;
  overflow-y: auto;
  ::-webkit-scrollbar {
    width: 10px;
    background-color: ${(props) =>
      props.theme.globalForm.scrollbarBackgroundColor} !important;
  }
  ::-webkit-scrollbar-thumb {
    background-color: ${(props) =>
      props.theme.globalForm.scrollbarThumbColor} !important;
  }
`;
