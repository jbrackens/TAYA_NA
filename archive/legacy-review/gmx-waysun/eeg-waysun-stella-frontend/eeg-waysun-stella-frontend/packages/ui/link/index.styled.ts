import styled from "styled-components";

type LinkContainerProps = {
  $fullWidth: boolean;
};
export const LinkContainer = styled.div<LinkContainerProps>`
  text-align: center;
  display: ${(props) => (props.$fullWidth ? "block" : "contents")};
  margin-top: 20px;
`;

export const StyledLink = styled.a`
  color: ${(props) => props.theme.uiComponents.link.fontColor};
  text-decoration: none;
  &:hover {
      text-decoration: underline;
  }
`;