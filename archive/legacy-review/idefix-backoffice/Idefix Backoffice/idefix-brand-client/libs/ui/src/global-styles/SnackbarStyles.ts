import { css } from "styled-components";

export default css`
  .Toastify__toast-container {
    width: auto;
    max-width: 440px;
    @media screen and (max-width: 768px) {
      max-width: 100vw;
      left: 24px;
      right: 24px;
      top: 24px;
    }
  }

  .Toastify__toast {
    background: #fff;
    box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    padding: 0px;
    min-height: initial;
    @media screen and (max-width: 768px) {
      margin-bottom: 1rem;
    }
  }

  .snackbar-body {
    margin: 0;
  }
`;
