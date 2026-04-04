import * as React from "react";
import styled from "styled-components";
import { CloseIcon } from "@brandserver-client/icons";

export const StyledCMSPage = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 452px;

  iframe {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  .close-button {
    position: absolute;
    top: -10px;
    right: -10px;
    cursor: pointer;
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.palette.secondary};

    &:hover {
      opacity: 0.8;
    }
  }
`;

interface Props {
  src: string;
  onClose: () => void;
}

const CMSPage: React.FC<Props> = ({ src, onClose }) => (
  <StyledCMSPage>
    <iframe frameBorder="0" src={src} width="100%" height="100%" />
    <CloseIcon onClick={onClose} className="close-button" />
  </StyledCMSPage>
);

export default CMSPage;
