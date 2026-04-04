import * as React from "react";
import styled from "styled-components";
import { Snackbar, SnackbarProps } from "../Snackbar";
import { Breakpoints } from "../../breakpoints";
import { rgba } from "@brandserver-client/utils";

const StyledSnackbarModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000000;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => rgba(theme.palette.contrast, 0.85)};
  @supports (backdrop-filter: blur(7px)) {
    backdrop-filter: blur(7px);
  }
  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding-bottom: 80px;
  }
  .snackbar-container {
    width: 440px;
    background: ${({ theme }) => rgba(theme.palette.contrast, 0.85)};
    box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    padding: 0px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      max-width: calc(100vw - 50px);
    }
  }
`;

export type SnackbarModalProps = SnackbarProps;

const SnackbarModal: React.FC<SnackbarModalProps> = ({
  content,
  title,
  action,
  close
}) => {
  return (
    <StyledSnackbarModal>
      <div className="snackbar-container">
        <Snackbar
          isModal
          title={title}
          content={content}
          action={action}
          close={close}
        />
      </div>
    </StyledSnackbarModal>
  );
};

export { SnackbarModal };
