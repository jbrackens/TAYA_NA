import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
import { CloseIcon } from "@brandserver-client/icons";

export const StyledFramePage = styled.div`
  position: relative;
  width: 700px;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding-top: 16px;
    width: 100%;
  }

  .frame-holder {
    overflow-y: auto;
    position: relative;
    min-height: 50vh;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 20px;
      min-height: 100vh;
    }
  }

  iframe {
    border: 0;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .close-btn {
    position: absolute;
    top: 0;
    right: -24px;
    z-index: 99;
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      top: 5px;
      right: 0;
    }

    .icon-close svg {
      width: 14px;
      height: 14px;

      fill: ${({ theme }) => theme.palette.secondary};
    }

    &:hover {
      opacity: 0.8;
    }
  }
`;

interface Props {
  lang: string;
  page: string;
  onClose: () => void;
}

const FramePage: React.FC<Props> = ({ lang, page, onClose }) => (
  <StyledFramePage>
    <div className="frame-holder">
      <iframe frameBorder="0" src={`/${lang}/content/${page}`} />
    </div>
    <span onClick={onClose} className="close-btn">
      <span className="icon-close">
        <CloseIcon />
      </span>
    </span>
  </StyledFramePage>
);

export default FramePage;
