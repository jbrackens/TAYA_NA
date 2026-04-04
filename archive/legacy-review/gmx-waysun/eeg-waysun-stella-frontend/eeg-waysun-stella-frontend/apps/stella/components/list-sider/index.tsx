import React, { FC, useState, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import { useTranslation } from "next-export-i18n";
import { ListSider } from "../layout/index.styled";
import {
  EventsList,
  ListContainer,
  ListHeader,
  SearchInput,
  ListHeaderButtonDiv,
  ListMessageSection,
} from "./index.styled";
import { SearchOutlined } from "@ant-design/icons";

type ListElement = {
  id: string;
  title: string;
  status: string;
};

type ListSiderComponentProps = {
  list: Array<ListElement>;
  title: string;
  selectedId: string;
  elementUrl: string;
  addUrl?: string;
  loading?: boolean;
  hideAddSection?: boolean;
  hideSearchSection?: boolean;
  customMessage?: string;
};

export const ListSiderComponent: FC<ListSiderComponentProps> = ({
  list,
  title,
  addUrl = "",
  selectedId,
  elementUrl,
  loading,
  hideAddSection = false,
  hideSearchSection = false,
  customMessage = "",
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");

  const searchResultList = useMemo(() => {
    let filtered = [];
    filtered = list.filter(
      (op: any) =>
        op.title.toLowerCase().indexOf(inputValue.toLowerCase()) >= 0,
    );
    return filtered;
  }, [list, inputValue]);

  const listElements = inputValue ? searchResultList : list;

  return (
    <>
      <ListSider collapsible width={370} trigger={null}>
        <ListContainer>
          {!hideAddSection && (
            <ListHeader>
              <span>{t(title)}</span>
              <ListHeaderButtonDiv>
                <button
                  onClick={() =>
                    router.push(addUrl, undefined, { shallow: true })
                  }
                >
                  <PlusOutlined />
                </button>
              </ListHeaderButtonDiv>
            </ListHeader>
          )}
          {!hideSearchSection && (
            <SearchInput
              placeholder={t("SEARCH")}
              fullWidth
              value={inputValue}
              onChange={(e: any) => setInputValue(e ? e.target.value : "")}
              icon={<SearchOutlined />}
              clearInput
              iconBackground
            />
          )}
          {!customMessage && (
            <EventsList
              data={listElements.map((el) => ({
                key: el.id,
                value: el.title,
                variant: el.variant
                  ? el.variant
                  : el.status
                  ? "positive"
                  : "negative",
              }))}
              selectedKey={typeof selectedId === "string" ? selectedId : ""}
              onClick={(key) =>
                router.push(`${elementUrl}${key}`, undefined, { shallow: true })
              }
              fullWidth
              clickable
              loading={loading}
            />
          )}
          {customMessage && (
            <ListMessageSection>{customMessage}</ListMessageSection>
          )}
        </ListContainer>
      </ListSider>
    </>
  );
};
