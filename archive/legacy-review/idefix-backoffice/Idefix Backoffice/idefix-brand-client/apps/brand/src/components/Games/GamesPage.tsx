import * as React from "react";
import styled from "styled-components";
import Games from "./Games";

const StyledGamesPage = styled.div`
  height: 100%;
  width: 100%;
  min-height: calc(100vh - 60px);
  background-color: ${({ theme }) => theme.palette.primaryLight};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const GamesPage = () => {
  return (
    <StyledGamesPage>
      <Games />
    </StyledGamesPage>
  );
};

export default GamesPage;
