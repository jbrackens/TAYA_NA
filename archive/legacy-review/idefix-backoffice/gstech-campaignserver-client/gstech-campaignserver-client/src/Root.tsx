import * as React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import Routes from "./routes";
import { theme, GlobalStyle, Typography } from "./styled";
import { GoogleAuthProvider } from "./modules/google-auth";

const Root: React.FC = () => (
  <GoogleAuthProvider>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Typography />
      <Router>
        <Routes />
      </Router>
    </ThemeProvider>
  </GoogleAuthProvider>
);

export default Root;
