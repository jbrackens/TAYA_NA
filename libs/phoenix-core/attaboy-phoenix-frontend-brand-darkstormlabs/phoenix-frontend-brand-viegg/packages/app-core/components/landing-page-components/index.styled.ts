import styled from "styled-components";

const removeButtonStyle = `
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
`;

type HeaderContainerProps = {
  $display: boolean;
  $fixedHeader: boolean;
};

export const Wrapper = styled.div<HeaderContainerProps>`
  width: 100%;
  height: 60px;
  background-color: ${(props) => props.theme.landingPage.colors.headerBack};
  transition: top ${(props) => (props.$fixedHeader ? "0.25s" : "0s")} linear;
  position: ${(props) => (props.$fixedHeader ? "fixed" : "absolute")};
  left: 0;
  top: ${(props) => (props.$display ? -100 : 0)}px;
  z-index: 1;
`;

export const HeaderContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  height: 60px;
  background-color: ${(props) => props.theme.landingPage.colors.headerBack};
  color: ${(props) => props.theme.landingPage.colors.white};
  display: flex;
  align-items: center;
`;

export const IconDiv = styled.img`
  height: 40px;
  margin-left: 50px;
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    margin-left: 30px;
  }
`;

export const EsportsRedirectLink = styled.a`
  margin-left: 40px;
  font-size: 20px;
  margin-top: 5px;
  font-weight: 900;
  color: ${(props) => props.theme.landingPage.colors.white};
  &:hover,
  &:focus,
  &:active {
    color: ${(props) => props.theme.landingPage.colors.white};
    text-decoration: underline;
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.large}) {
    margin-left: 25px;
  }
`;

export const RightSection = styled.div`
  text-align: right;
  flex-grow: 1;
  margin-right: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    display: none;
  }
`;

export const MobileMenuIcon = styled.div`
  margin-right: 30px;
  position: absolute;
  right: 0;
  display: none;
  button {
    ${removeButtonStyle}
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    display: initial;
  }
`;

export const MobileMenuComponent = styled.div`
  &.hide {
    visibility: hidden;
    opacity: 0;
  }
  &.show {
    visibility: visible;
    opacity: 1;
  }
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  z-index: 1;
  transition: visibility 0.25s, opacity 0.25s linear;
  .menu-overlay {
    z-index: 2;
    background-color: ${(props) =>
      props.theme.landingPage.colors.mobileMenuBack};
    position: fixed;
    height: 100%;
    width: 100%;
  }
`;

export const MobileMenuCloseButton = styled.button`
  ${removeButtonStyle}
  position: absolute;
  right: 30px;
  top: 10px;
  font-size: 25px;
  width: 35px;
  z-index: 3;
`;

export const MobileMenuList = styled.ul`
  position: relative;
  list-style-type: none;
  text-align: center;
  padding: 0;
  margin-top: 150px;
  z-index: 3;
  li {
    margin-top: 20px;
  }
`;

export const ResponsibleGamingTextContainer = styled.span`
  margin: 0 20px 0 10px;
  color: ${(props) => props.theme.landingPage.colors.white};
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
`;

export const ResponsibleGamingLogo = styled.img`
  width: 25px;
  cursor: pointer;
`;

export const LandingPageCTA = styled.button`
  border-radius: 0;
  text-transform: none;
  width: 125px;
  text-shadow: 0 -1px 0 rgb(0 0 0 / 12%);
  box-shadow: 0 2px 0 rgb(0 0 0 / 5%);
  margin-right: 7px;
  margin-bottom: 0;
  font-size: 17px;
  height: 34px;
  font-weight: 900;
  cursor: pointer;
  color: ${(props) => props.theme.landingPage.colors.white};
  &.primary {
    background-color: ${(props) =>
      props.theme.landingPage.colors.buttonPrimary};
    border: ${(props) => props.theme.landingPage.colors.buttonPrimary};
    &:hover,
    &:focus,
    &:active {
      background-color: ${(props) =>
        props.theme.landingPage.colors.buttonPrimaryHover};
      border: ${(props) => props.theme.landingPage.colors.buttonPrimaryHover};
    }
  }
  &.secondary {
    background-color: ${(props) =>
      props.theme.landingPage.colors.buttonSecondary};
    border: ${(props) => props.theme.landingPage.colors.buttonSecondary};
    &:hover,
    &:focus,
    &:active {
      background-color: ${(props) =>
        props.theme.landingPage.colors.buttonSecondaryHover};
      border: ${(props) => props.theme.landingPage.colors.buttonSecondaryHover};
    }
  }
  &.large {
    font-size: 25px;
    height: 50px;
    @media (max-width: ${(props) =>
        props.theme.landingPage.deviceWidth.small}) {
      font-size: 20px;
    }
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.large}) {
    width: 95px;
  }
`;

type LandingSectionWrapperProps = {
  $backColor: string;
};

export const LandingSectionWrapper = styled.div<LandingSectionWrapperProps>`
  background-color: ${(props) => props.$backColor};
  position: relative;
  width: 100%;
`;

type LandingSectionContainerProps = {
  $reverse: boolean;
};

export const LandingSectionContainer = styled.div<LandingSectionContainerProps>`
  color: ${(props) => props.theme.landingPage.colors.white};
  width: 100%;
  padding: 90px 0;
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  flex-direction: ${(props) => (props.$reverse ? "row-reverse" : "row")};
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    flex-direction: column;
    div {
      width: 100%;
    }
  }
`;

type TextContainerProps = {
  $reverse: boolean;
  $hideCTA: boolean;
};

export const TextContainer = styled.div<TextContainerProps>`
  flex-grow: 1;
  width: 40%;
  font-family: "Inter", sans-serif;
  padding: ${(props) => (props.$reverse ? "0 10px 0 50px" : "0 50px 0 10px")};
  .sub-header {
    font-weight: 300;
    font-size: 15px;
    margin-bottom: 10px;
  }
  .header {
    font-weight: 700;
    font-size: 44.8px;
    line-height: 1.3;
    margin-bottom: 25px;
    word-break: break-word;
  }
  p {
    color: ${(props) => props.theme.landingPage.colors.paraTextColor};
    margin-bottom: 22px;
    font-size: 16px;
  }
  .bottom-section {
    width: 70%;
    margin-top: 60px;
    display: ${(props) => (props.$hideCTA ? "none" : "initial")};
    .button-group {
      display: flex;
      margin-bottom: 12px;
      button {
        flex-grow: 1;
      }
    }
    .resp-game {
      text-align: center;
    }
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.large}) {
    .bottom-section {
      width: 100%;
    }
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    padding: 0 30px;
    padding-top: 50px;
    .header {
      font-size: 36px;
    }
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.small}) {
    .header {
      font-size: 30px;
    }
  }
`;

export const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  text-align: center;
  width: 60%;
  img {
    width: 550px;
    max-height: 550px;
    @media (max-width: ${(props) =>
        props.theme.landingPage.deviceWidth.large}) {
      width: 400px;
    }
    @media (max-width: ${(props) =>
        props.theme.landingPage.deviceWidth.small}) {
      width: 265px;
    }
  }
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    padding: 0 30px;
  }
`;

type SectionBottomDivProps = {
  $color: string;
};

export const SectionBottomDiv = styled.div<SectionBottomDivProps>`
  position: absolute;
  bottom: -1px;
  background-color: transparent;
  width: 100%;
  height: 30px;
  overflow: hidden;
  div {
    background-color: ${(props) => props.$color};
    border: 0px;
    height: 100%;
    position: absolute;
    position: absolute;
    &.style-div-1 {
      width: 30%;
      transform: skewX(-31deg);
      right: -20px;
    }
    &.style-div-2 {
      width: 20%;
      transform: skewX(31deg);
      left: -20px;
    }
  }
  &.type-1 {
    .style-div-1 {
      width: 20%;
    }
    .style-div-2 {
      display: none;
    }
  }
  &.type-2 {
    .style-div-1 {
      width: 60%;
    }
    .style-div-2 {
      display: none;
    }
  }
  &.type-3 {
    .style-div-1 {
      width: 30%;
    }
    .style-div-2 {
      width: 10%;
    }
  }
  &.type-4 {
    .style-div-1 {
      width: 40%;
    }
    .style-div-2 {
      display: none;
    }
  }
`;
