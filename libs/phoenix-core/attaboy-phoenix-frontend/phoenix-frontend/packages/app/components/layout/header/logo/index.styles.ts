import styled from "styled-components";

export const Logo = styled.div`
  display: flex;
  width: ${(props) =>
    props.theme.width
      ? `${props.theme.width}${props.theme.unit || "%"}`
      : "100%"};
  height: ${(props) =>
    props.theme.height
      ? `${props.theme.height}${props.theme.unit || "%"}`
      : "auto"};
  max-height: 100%;
  margin-right: 4rem;

  align-items: center;
  justify-content: center;

  img {
    max-height: ${(props) => 3.4 * props.theme.baseGutter}px;
  }
`;
