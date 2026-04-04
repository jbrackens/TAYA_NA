import { FC, useEffect, useState } from "react";
import {
  MainListUl,
  MainListItemStyle,
  VariantDiv,
  MainListItemA,
  LoaderDiv,
} from "./index.styled";
import { LoaderInline } from "./..";

enum DefaultList {
  KEY = "Nokey",
  VALUE = "Novalue",
}

type MainListItemProps = {
  tagType?: "div" | "li";
  fullWidth?: boolean;
  fieldKey?: string;
  clickable?: boolean;
  selected?: boolean;
  onClick?: (key?: string, index?: number) => void;
  variant?: "positive" | "negative" | "none";
  listNumber?: number;
  loading?: boolean;
};

export const MainListItem: FC<MainListItemProps> = ({
  children: listChild,
  tagType = "div",
  fullWidth = true,
  fieldKey = "list",
  clickable = true,
  selected = false,
  onClick,
  variant = "none",
  listNumber = 0,
  loading = false,
}) => {
  const [listSelected, setListSelected] = useState(false);

  useEffect(() => {
    setListSelected(selected);
  }, [selected]);

  const listItemClicked = () => {
    !loading && clickable && onClick && onClick(fieldKey, listNumber);
    !loading && clickable && setListSelected(true);
  };

  return (
    <MainListItemStyle
      as={tagType}
      $fullWidth={fullWidth}
      $clickable={loading ? false : clickable}
      onClick={listItemClicked}
      $selected={listSelected}
    >
      <MainListItemA $loading={loading} title={listChild?.toString()}>
        {listChild}
      </MainListItemA>
      <VariantDiv $variant={variant}></VariantDiv>
      {loading && (
        <LoaderDiv>
          <LoaderInline />
        </LoaderDiv>
      )}
    </MainListItemStyle>
  );
};

export type MainListDataType = {
  key?: string;
  value?: any;
  variant?: "positive" | "negative" | "none";
};
type MainListProps = {
  data: Array<MainListDataType>;
  fullWidth?: boolean;
  clickable?: boolean;
  onClick?: (key: string | undefined, index?: number) => void;
  selectedKey?: string | undefined;
  className?: string;
  loading?: boolean;
};

export const MainList: FC<MainListProps> = ({
  fullWidth = false,
  data = [],
  clickable = true,
  onClick,
  selectedKey = "",
  className = "",
  loading = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(selectedKey);
  const listForDisplaying =
    data.length === 0 && loading ? [{}, {}, {}, {}, {}, {}, {}] : data;

  useEffect(() => {
    setSelectedIndex(selectedKey);
  }, [selectedKey]);

  const handleClick = (key: string = "", index?: number) => {
    setSelectedIndex(key);
    onClick && onClick(key, index);
  };

  return (
    <MainListUl className={className}>
      {listForDisplaying.map(
        (
          { key = DefaultList.KEY, value = DefaultList.VALUE, variant },
          listNumber,
        ) => (
          <MainListItem
            key={`key${listNumber}`}
            fieldKey={key}
            listNumber={listNumber}
            fullWidth={fullWidth}
            tagType="li"
            clickable={clickable}
            onClick={handleClick}
            selected={selectedIndex === key}
            variant={variant}
            loading={loading}
          >
            {value}
          </MainListItem>
        ),
      )}
    </MainListUl>
  );
};
