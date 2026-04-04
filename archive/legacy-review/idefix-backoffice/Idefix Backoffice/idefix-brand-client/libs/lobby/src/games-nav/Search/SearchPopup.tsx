import * as React from "react";
import styled from "styled-components";
import { Breakpoints } from "@brandserver-client/ui";
import { BinIcon, CloseIcon } from "@brandserver-client/icons";
import { useMessages } from "@brandserver-client/hooks";

interface Props {
  recommendations: string[];
  searchHistoryEntries: string[];
  onSearchHistoryEntry: (entry: string) => void;
  onDeleteHistoryEntry: (entry: string) => void;
  onCleanHistory: () => void;
  onSearchRecommendation: (recommendation: string) => void;
}

const StyledSearchPopup = styled.div`
  position: absolute;
  top: 60px;
  left: 0;
  height: calc(100vh - 120px);
  width: 100%;
  padding: 35px;
  overflow-y: auto;
  z-index: 1005;
  background-color: ${({ theme }) => theme.palette.primaryLight};

  @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
    top: 40px;
    height: calc(100vh - 100px);
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    width: 300px;
    border-radius: 5px;
    top: 52px;
    right: 0;
    left: unset;
    box-shadow: ${({ theme }) => theme.shadows.gameThumbHover};
    background-color: ${({ theme }) => theme.palette.primaryLight};
    max-height: calc(100vh - 184px);
    height: fit-content;
  }

  .search-popup__history {
    margin-bottom: 42px;
  }

  h2 {
    ${({ theme }) => theme.typography.text24Bold};
    color: ${({ theme }) => theme.palette.contrastLight};
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  ul {
    ${({ theme }) => theme.typography.text16};
    color: ${({ theme }) => theme.palette.contrast};

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      a:hover {
        cursor: pointer;
        color: ${({ theme }) => theme.palette.accent};
      }

      svg {
        height: 16px;
        width: 16px;
        fill: ${({ theme }) => theme.palette.secondaryDark};

        &:hover {
          cursor: pointer;
          fill: ${({ theme }) => theme.palette.error};
        }
      }
    }
  }

  .search-popup__clear-history {
    display: inline-flex;
    align-items: center;
    color: ${({ theme }) => theme.palette.contrast};
    ${({ theme }) => theme.typography.text16Bold}

    &:hover {
      cursor: pointer;
    }

    svg {
      height: 16px;
      width: 16px;
      margin-right: 6px;
      fill: ${({ theme }) => theme.palette.contrast};
    }
  }
`;

const SearchPopup: React.FC<Props> = ({
  recommendations,
  searchHistoryEntries,
  onSearchHistoryEntry,
  onDeleteHistoryEntry,
  onCleanHistory,
  onSearchRecommendation
}) => {
  const messages = useMessages({
    history: "search.history",
    clearHistory: "search.clear-history",
    recommended: "search.recommended"
  });

  return (
    <StyledSearchPopup>
      {searchHistoryEntries.length > 0 && (
        <div className="search-popup__history">
          <h2>{messages.history}</h2>
          <ul>
            {searchHistoryEntries.map(entry => (
              <li key={entry}>
                <a onClick={() => onSearchHistoryEntry(entry)}>{entry}</a>
                <CloseIcon onClick={() => onDeleteHistoryEntry(entry)} />
              </li>
            ))}
          </ul>
          <div className="search-popup__clear-history" onClick={onCleanHistory}>
            <BinIcon />
            {messages.clearHistory}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="search-popup__recommendations">
          <h2>{messages.recommended}</h2>
          <ul>
            {recommendations.map(recommendation => (
              <li key={recommendation}>
                <a onClick={() => onSearchRecommendation(recommendation)}>
                  {recommendation}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </StyledSearchPopup>
  );
};

export default SearchPopup;
