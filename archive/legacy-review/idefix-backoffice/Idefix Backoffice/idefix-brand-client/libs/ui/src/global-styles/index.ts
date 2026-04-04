import { memo } from "react";
import reset from "./Reset";
import normalize from "./Normalize";
import snackbarStyles from "./SnackbarStyles";
import { createGlobalStyle } from "styled-components";

export default memo(createGlobalStyle`
  ${reset}
  ${normalize}
  ${snackbarStyles}
  
  body {
    font-family:  "Mulish", "PT Sans", sans-serif !important;
    // TODO: Move font loading to the brand theme
  }
`);
