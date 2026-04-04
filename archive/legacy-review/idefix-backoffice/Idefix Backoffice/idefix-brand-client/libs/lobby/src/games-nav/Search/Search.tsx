import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import {
  useMessages,
  useOutsideClick,
  useSearchHistory
} from "@brandserver-client/hooks";
import { useRegistry, Breakpoints } from "@brandserver-client/ui";
import { ClearIcon, SearchIcon } from "@brandserver-client/icons";
import cn from "classnames";
import { getSearchRecommendations } from "../../app";
import SearchPopup from "./SearchPopup";

const StyledSearch = styled.div`
  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    flex-shrink: 1;
    position: relative;
    width: 100%;
  }

  .search-form {
    display: flex;
    width: 100%;
    align-items: center;
    padding: 10px;
    background: ${({ theme }) => theme.palette.primaryLight};
    box-shadow: ${({ theme }) => theme.shadows.toolbar};

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      box-shadow: unset;
      padding: 0px;
      border-radius: 5px;
    }

    &__input {
      padding: 9px 33px 11px 33px;
      box-shadow: ${({ theme }) =>
        `0 0 0 2px ${theme.palette.primaryLightest2}`};
      color: ${({ theme }) => theme.palette.contrast};
      caret-color: ${({ theme }) => theme.palette.accent};
      text-overflow: ellipsis;

      &::placeholder {
        text-overflow: ellipsis;
        color: ${({ theme }) => theme.palette.secondaryDarkest2};
      }

      &:hover {
        box-shadow: ${({ theme }) =>
          `0 0 0 2px ${theme.palette.primaryLightest2}`};
      }

      &:focus {
        outline: 0;
        box-shadow: ${({ theme }) =>
          `0 0 0 2px ${theme.palette.primaryLightest2}`};
      }

      &:focus + .base-input__icon {
        fill: ${({ theme }) => theme.palette.secondaryDarkest2};
      }

      @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
        background: ${({ theme }) => theme.palette.primaryLightest};
      }
    }

    &__icon {
      height: 16px;
      width: 16px;

      &.base-input__icon--right {
        right: 12px;

        &:hover {
          cursor: pointer;
        }
      }
    }

    &__cancel {
      margin-left: 10px;
      ${({ theme }) => theme.typography.text16};
      color: ${({ theme }) => theme.palette.accent};

      &:hover {
        cursor: pointer;
        color: ${({ theme }) => theme.palette.accentLight};
      }
    }

    @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
      width: 30px;
      padding: 0;
      box-shadow: unset;
      background: transparent;

      &--full-width {
        width: 100%;
        min-width: 250px;
      }

      &__input {
        padding: 4px 7px 6px 7px;

        &::placeholder {
          color: transparent;
        }

        &--full-width {
          padding: 4px 19px 6px 30px;

          &::placeholder {
            color: ${({ theme }) => theme.palette.secondaryDarkest2};
          }
        }
      }

      &__icon {
        &.base-input__icon--left {
          left: 7px;
        }
      }
    }
  }
`;

interface Props {
  isMobile: boolean;
  searchPopupIsOpen: boolean;
  searchQuery: string;
  isAllCategory: boolean;
  updateSearchQuery(searchQuery: string): void;
  setSearchPopupIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  resetActiveCategory: () => void;
}

const Search: React.FC<Props> = ({
  searchQuery,
  isAllCategory,
  searchPopupIsOpen,
  isMobile,
  resetActiveCategory,
  updateSearchQuery,
  setSearchPopupIsOpen
}) => {
  const messages = useMessages({
    findAGame: "form.find-a-game",
    cancel: "search.cancel"
  });

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [isSearchActive, setIsSearchActive] = React.useState(false);

  const {
    entries: searchHistoryEntries,
    addHistoryEntry,
    cleanHistory,
    deleteHistoryEntry
  } = useSearchHistory([]);

  const recommendations = useSelector(getSearchRecommendations);

  const { BaseInput } = useRegistry();

  const resetCategory = React.useCallback(() => {
    if (!isAllCategory) {
      resetActiveCategory();
    }
  }, [isAllCategory]);

  const handleChangeSearch = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      resetCategory();
      updateSearchQuery(e.target.value);
    },
    [resetCategory]
  );

  const handleCancelSearch = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.stopPropagation();
      updateSearchQuery("");
      setIsSearchActive(false);
      setSearchPopupIsOpen(false);
    },
    []
  );

  const handleClearSearch = React.useCallback(() => {
    updateSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleFocusSearch = React.useCallback(() => {
    setIsSearchActive(true);
    setSearchPopupIsOpen(true);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleCleanHistory = React.useCallback(() => {
    resetCategory();
    updateSearchQuery("");
    cleanHistory();
  }, [isAllCategory]);

  const handleSearchHistoryEntry = React.useCallback(
    (entry: string) => {
      if (isMobile) {
        setSearchPopupIsOpen(false);
      }
      resetCategory();
      updateSearchQuery(entry);
    },
    [isMobile, isAllCategory]
  );

  const handleSearchRecommendation = React.useCallback(
    (recommendation: string) => {
      if (isMobile) {
        setSearchPopupIsOpen(false);
      }
      resetCategory();
      updateSearchQuery(recommendation);
    },
    [isMobile, isAllCategory]
  );

  const handleAddHistoryEntry = React.useCallback(() => {
    if (searchQuery && !recommendations.some(el => el === searchQuery)) {
      addHistoryEntry(searchQuery);
    }

    setSearchPopupIsOpen(false);
  }, [searchQuery, recommendations]);

  useOutsideClick(searchContainerRef, handleAddHistoryEntry);

  return (
    <StyledSearch ref={searchContainerRef} onClick={handleFocusSearch}>
      <form
        autoComplete="off"
        className={cn("search-form", {
          "search-form--full-width": isSearchActive
        })}
        onSubmit={event => {
          event.preventDefault();
          handleAddHistoryEntry();
          if (searchInputRef.current) {
            searchInputRef.current.blur();
          }
        }}
      >
        <BaseInput
          name="search"
          type="search"
          value={searchQuery}
          placeholder={messages.findAGame}
          classes={{
            input: cn("search-form__input", {
              "search-form__input--full-width": isSearchActive
            }),
            icon: "search-form__icon"
          }}
          rightIcon={
            searchQuery !== "" && isMobile ? (
              <ClearIcon onClick={handleClearSearch} />
            ) : null
          }
          leftIcon={<SearchIcon />}
          ref={searchInputRef}
          onChange={handleChangeSearch}
        />
        {isSearchActive && isMobile && (
          <a className="search-form__cancel" onClick={handleCancelSearch}>
            {messages.cancel}
          </a>
        )}
      </form>
      {((searchPopupIsOpen && !isMobile) ||
        (isMobile && searchPopupIsOpen && searchQuery.length === 0)) && (
        <SearchPopup
          recommendations={recommendations}
          searchHistoryEntries={searchHistoryEntries}
          onSearchHistoryEntry={handleSearchHistoryEntry}
          onCleanHistory={handleCleanHistory}
          onDeleteHistoryEntry={deleteHistoryEntry}
          onSearchRecommendation={handleSearchRecommendation}
        />
      )}
    </StyledSearch>
  );
};

export default Search;
