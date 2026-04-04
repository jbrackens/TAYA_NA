import * as React from "react";
import { ToastContainer, Slide } from "react-toastify";
import styled from "styled-components";
import "react-toastify/dist/ReactToastify.css";

const StyledToast = styled(ToastContainer)`
  .Toastify__toast {
    border-radius: 8px;
  }
`;

export const Toast = () => (
  <StyledToast
    autoClose={3000}
    position="bottom-left"
    transition={Slide}
    closeButton={false}
    closeOnClick
    hideProgressBar
  />
);
