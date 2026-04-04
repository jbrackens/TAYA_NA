import * as React from "react";
import throttle from "lodash/throttle";
import styled from "styled-components";

import searchByKeys from "../../utils/searchByKeys";
import { Search as SearchIcon } from "../../icons";
import { useOnClickOutside } from "../../hooks";
import { TextInput } from "../TextInput";
import { Card } from "../Card";

const StyledSearch = styled.div`
  width: 100%;
  .search__results-container {
    position: relative;
  }

  .search__results {
    position: absolute;
    z-index: ${({ theme }) => theme.zIndex.header};
    width: 100%;
    margin-bottom: 32px;
    max-height: 255px;
    overflow-y: auto;
    top: 8px;
    background: ${({ theme }) => theme.palette.white};
    box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.32);
    border-radius: 8px;
    padding: 4px;

    > div:not(:first-child) {
      margin-top: 4px;
    }

    > div.card {
      width: 100%;
      &:hover {
        cursor: pointer;
      }
    }
  }

  .search__no-results {
    width: 100%;
    color: ${({ theme }) => theme.palette.blackDark};
  }
`;

interface SearchCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  data: any[];
  searchQuery: string;
  searchBy: string[];
  children: (searchItem: any, onClose: () => void) => React.ReactChild;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchCard: React.FC<SearchCardProps> = ({
  data,
  searchQuery,
  searchBy,
  children,
  onChange,
  disabled,
  placeholder,
  ...rest
}: SearchCardProps) => {
  const filteredData = searchByKeys(searchBy, searchQuery, data);
  const searchRef = React.useRef(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [focus, setFocus] = React.useState<boolean>(false);
  const [maxCount, setMaxCount] = React.useState<number>(10);

  const onOpen = () => {
    setFocus(true);
  };
  const onClose = () => {
    setFocus(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onScroll = React.useCallback(
    throttle((e: any) => {
      if (e.target) {
        const isEnd = e.target.scrollHeight - e.target.scrollTop - 255 <= e.target.clientHeight;
        if (isEnd) {
          setMaxCount(prev => prev + 10);
        }
      }
    }, 150),
    []
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTimeout(onChange(e) as unknown as TimerHandler, 0);
    },
    [onChange]
  );

  React.useEffect(() => {
    if (wrapperRef.current && maxCount >= filteredData.length) {
      wrapperRef.current.removeEventListener("scroll", onScroll);
    }
  }, [maxCount, onScroll, filteredData]);

  React.useEffect(() => {
    const { current } = wrapperRef;
    current?.addEventListener("scroll", onScroll);
    return () => {
      current?.removeEventListener("scroll", onScroll);
    };
  }, [onScroll, focus]);

  useOnClickOutside(searchRef, onClose);

  return (
    <StyledSearch ref={searchRef} {...rest}>
      <TextInput
        placeholder={placeholder || `Search by ${searchBy.join(", ")}`}
        icon={<SearchIcon />}
        value={searchQuery}
        onChange={handleChange}
        onClick={onOpen}
        disabled={disabled}
        data-testid="reward-search"
      />
      <div className="search__results-container">
        {focus && (
          <div className="search__results" ref={wrapperRef}>
            {filteredData.length ? (
              filteredData.slice(0, maxCount).map(searchItem => children(searchItem, onClose))
            ) : (
              <Card className="search__no-results" appearance="flat">
                <span className="text-small-reg">What you searched was unfortunately not found or doesn't exist.</span>
              </Card>
            )}
          </div>
        )}
      </div>
    </StyledSearch>
  );
};

export { SearchCard };
