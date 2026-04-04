import styled from "styled-components";

type StyledHeaderProps = {
  $size: "large" | "medium" | "small";
  $variation: "primary" | "secondary";
  $customFontSize: number;
};
export const StyledHeader = styled.div<StyledHeaderProps>`
  margin: ${(props) =>
      props.$size === "large"
        ? "50px"
        : props.$size === "medium"
        ? "20px"
        : "10px"}
    0;
  color: ${(props) =>
    props.$variation === "primary"
      ? props.theme.uiComponents.header.primaryColor
      : props.theme.uiComponents.header.secondaryColor};
  font-size: ${(props) =>
    props.$customFontSize > 0
      ? `${props.$customFontSize}px`
      : props.$size === "large"
      ? "50px"
      : props.$size === "medium"
      ? "40px"
      : "26px"};
  @media (max-width: ${(props) => props.theme.deviceWidth.medium}) {
    font-size: ${(props) =>
      props.$customFontSize > 0
        ? `${props.$customFontSize}px`
        : props.$size === "large"
        ? "40px"
        : props.$size === "medium"
        ? "30px"
        : "20px"};
    margin: ${(props) =>
        props.$size === "large"
          ? "30px"
          : props.$size === "medium"
          ? "10px"
          : "5px"}
      0;
  }
  @media (max-width: ${(props) => props.theme.deviceWidth.small}) {
    margin: 10px 0;
  }
  font-weight: bold;
  word-break: break-word;
  line-height: normal;
  letter-spacing: normal;
`;
