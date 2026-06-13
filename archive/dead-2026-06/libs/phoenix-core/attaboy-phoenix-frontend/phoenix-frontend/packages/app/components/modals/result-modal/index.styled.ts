import styled from "styled-components";
import { StyledResult } from "../../results/index.styled";
import { CoreModal } from "../../ui/modal";

export const ResultModal = styled(CoreModal)`
  .ant-modal-close {
    display: none;
  }

  .ant-modal-footer {
    display: none;
  }

  .ant-modal-body {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }

  ${StyledResult} {
    height: auto;
  }
`;
