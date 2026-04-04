import styled from "styled-components";
import { Button, ScrollbarStyle } from "ui";
import { Form } from "formik";

export const LoginWrapper = styled.div`
  padding: 93px 30px 30px 30px;
  width: 100%;
  background-color: ${(props) => props.theme.login.background};
  height: 100vh;
  ${ScrollbarStyle}
`;

export const LoginContainer = styled.div`
  width: 270px;
  margin-left: 78px;
  @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
    margin-left: 0;
  }
  @media (max-width: ${(props) => props.theme.deviceWidth.small}) {
    width: 100%;
  }
`;

export const LoginFormWrapper = styled.div`
  z-index: 5;
  position: relative;
`;

export const LoginPageImage = styled.img`
  z-index: 1;
  -webkit-filter: blur(3px);
  filter: blur(3px);
  position: fixed;
  right: 0;
  bottom: 0;
  max-width: 70%;
  max-height: 90%;
  user-select: none;
`;

const divHeight = { styleHeight1: 100, styleHeight2: 172 };
const leftLarge = "25%",
  leftMedium = "35%",
  leftSmall = "40%";
export const BackgroundStyledDiv = styled.div`
  width: 500px;
  border-radius: ${divHeight.styleHeight1 / 2}px;
  height: ${divHeight.styleHeight1}px;
  position: fixed;
  transform: rotate(-45deg);
  box-shadow: 0 0 3px 0px #1d1d1d;
  &.style-1 {
    z-index: 3;
    top: 0;
    background: linear-gradient(217deg, #be0014 28%, #e9601a 77%);
    box-shadow: 0 0 30px -10px black;
    left: ${leftLarge};
    @media (max-width: ${(props) => props.theme.deviceWidth.large}) {
      left: ${leftMedium};
    }
    @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
      left: ${leftSmall};
    }
  }
  &.style-2 {
    width: 400px;
    height: ${divHeight.styleHeight1}px;
    border-radius: ${divHeight.styleHeight1 / 2}px;
    z-index: 2;
    top: -70px;
    background: linear-gradient(217deg, #be0014 28%, #e9601a 77%);
    left: ${leftLarge};
    @media (max-width: ${(props) => props.theme.deviceWidth.large}) {
      left: ${leftMedium};
    }
    @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
      left: ${leftSmall};
    }
  }
  &.style-3 {
    margin-left: 165px;
    z-index: 4;
    width: 400px;
    top: -54px;
    background: #181818;
    height: ${divHeight.styleHeight2}px;
    border-radius: ${divHeight.styleHeight2 / 2}px;
    left: ${leftLarge};
    @media (max-width: ${(props) => props.theme.deviceWidth.large}) {
      left: ${leftMedium};
    }
    @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
      left: ${leftSmall};
    }
  }
  &.style-4 {
    z-index: 2;
    right: -265px;
    bottom: 165px;
    background: linear-gradient(251deg, #be0014 37%, #e9601a 85%);
    box-shadow: 0 0 30px -10px black;
    @media (max-width: ${(props) => props.theme.deviceWidth.small}) {
      display: none;
    }
  }
  &.style-5 {
    z-index: 2;
    left: 0;
    bottom: -60px;
    background: #121212;
    height: ${divHeight.styleHeight2}px;
    border-radius: ${divHeight.styleHeight2 / 2}px;
    @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
      display: none;
    }
    @media (max-width: ${(props) => props.theme.deviceWidth.small}) {
      display: none;
    }
  }
  &.style-6 {
    z-index: 1;
    left: -200px;
    bottom: -88px;
    background: #181818;
    height: ${divHeight.styleHeight2}px;
    border-radius: ${divHeight.styleHeight2 / 2}px;
    @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
      display: none;
    }
    @media (max-width: ${(props) => props.theme.deviceWidth.small}) {
      display: none;
    }
  }
`;

export const LoginButtonGroup = styled.div`
  margin: 35px 0;
`;

export const RegisterButtonGroup = styled.div`
  margin: 20px 0;
  display: flex;
`;

export const FieldWrapper = styled.div`
  margin: 10px 0 20px 0;
`;

export const Text = styled.div`
  margin: 20px 0;
`;

export const OrDiv = styled.div`
  text-align: center;
  margin: 20px 0;
  display: flex;
`;

export const OrDivContent = styled.div`
  flex-grow: 0;
  margin: 0 10px;
`;

export const HrDiv = styled.div`
  flex-grow: 1;
  border-top: 1px solid ${(props) => props.theme.content.divider};
  margin-top: 10px;
`;

export const OtherButtonGroup = styled.div`
  padding-bottom: 60px;
  .login-button {
    margin-bottom: 10px;
  }
`;

export const ButtonWithMarginBottom = styled(Button)`
  margin-bottom: 20px;
`;

export const RegisterModalFormSection = styled.div`
  padding: 35px 40px 25px;
`;

export const FormContainer = styled.div`
  text-align: left;
`;

export const Row = styled.div`
  display: flex;
  > div {
    margin: 0 5px;
    &:first-child {
      margin-left: 0;
    }
    &:last-child {
      margin-right: 0;
    }
  }
`;

export const CustomButton = styled(Button)`
  margin-left: auto;
  margin-right: 0;
`;

export const CustomForm = styled(Form)`
  > div {
    margin-bottom: 15px;
  }
`;
