import React, { useEffect, useState } from "react";
import LoginForm from "./loginForm";
import RegisterForm from "./registerForm";
import { defaultNamespaces } from "../defaults";
import {
  LoginWrapper,
  LoginContainer,
  LoginPageImage,
  BackgroundStyledDiv,
} from "./index.styled";

const Login = () => {
  const [showRegisterModal, setShowregisterModal] = useState(false);
  return (
    <LoginWrapper>
      <LoginContainer>
        <LoginForm newUser={() => setShowregisterModal(true)} />
        <RegisterForm
          showModal={showRegisterModal}
          close={() => setShowregisterModal(false)}
        />
        <LoginPageImage src="/images/LoginTablet.webp" />
        <BackgroundStyledDiv className="style-1" />
        <BackgroundStyledDiv className="style-2" />
        <BackgroundStyledDiv className="style-3" />
        <BackgroundStyledDiv className="style-4" />
        <BackgroundStyledDiv className="style-5" />
        <BackgroundStyledDiv className="style-6" />
      </LoginContainer>
    </LoginWrapper>
  );
};

Login.namespacesRequired = [...defaultNamespaces];
export default Login;
