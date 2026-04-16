import styled from "styled-components";

export const LandingPageContainer = styled.div`
  background-color: rgb(24, 25, 26);
`;

export const ContentWrapper = styled.div`
  padding-top: 50px;
`;

type ScrollToTopButtonProps = {
  $displayButton: boolean;
};

export const ScrollToTopButton = styled.button<ScrollToTopButtonProps>`
  background: none;
  color: ${(props) => props.theme.landingPage.colors.white};
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  outline: inherit;
  position: fixed;
  border: 2px ${(props) => props.theme.landingPage.colors.white} solid;
  border-radius: 31px;
  height: 35px;
  width: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: visibility 0.25s, bottom 0.25s linear;
  right: 20px;
  img {
    transform: rotate(180deg);
    width: 12px;
  }
  &:hover {
    background-color: ${(props) =>
      props.theme.landingPage.colors.scrollUpButtonHover};
    border-color: ${(props) =>
      props.theme.landingPage.colors.scrollUpButtonHover};
  }
  visibility: ${(props) => (props.$displayButton ? "visible" : "hidden")};
  bottom: ${(props) => (props.$displayButton ? "" : "-")}20px;
  @media (max-width: ${(props) => props.theme.landingPage.deviceWidth.medium}) {
    visibility: hidden;
    bottom: -20px;
  }
`;
