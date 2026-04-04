import styled from "styled-components";

export const LoaderInlineDiv = styled.div`
  height: 17px;
  max-width: 150px;
  font-size: 30px;
  background: ${(props) => props.theme.uiComponents.loader.backColor};
  background-size: 200% 200%;
  -webkit-animation: Animation 1s ease infinite;
  -moz-animation: Animation 1s ease infinite;
  animation: Animation 1s ease infinite;
  border-radius: 20px;
  @-webkit-keyframes Animation {
    0% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
  @-moz-keyframes Animation {
    0% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
  @keyframes Animation {
    0% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
`;
