import * as React from "react";
import { ContentRow, ContentStatus, ContentType } from "app/types";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import styled from "styled-components";
import { CellProps, Column, Row } from "react-table";

import { PageLayout, Tabs, Tab, Table, DateTimeCell, LanguageCell } from "../../components";
import { selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import {
  fetchContent,
  LanguagesFilter,
  selectIsLoading,
  selectContentTableData,
  useLanguagesFilter,
  ShowMoreCell,
  resetContentState
} from "../../modules/content";
import { StatusCell, NameCell } from "./components";
import { AppDispatch } from "../../redux";
import { CONTENT_TYPES } from "../../utils/constants";

const StyledPage = styled.div`
  .control-tabs {
    display: flex;
    width: 100%;
    justify-content: space-between;
    &__right-panel {
      display: flex;
      > :not(:first-child) {
        margin-left: 10px;
      }
    }
  }
`;

interface Params {
  brandId: string;
  contentType: string;
}

const ContentPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const params = useParams<Params>();
  const brandId = params.brandId;
  const contentType = params.contentType as ContentType;
  const [status, setStatus] = React.useState<ContentStatus | "all">("all");

  const isLoadingContent = useSelector(selectIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);
  const isLoading = isLoadingContent || isLoadingSettings || isLoadingBrandSettings;

  const tableData = useSelector(selectContentTableData);
  const {
    filteredData,
    isLanguagesFilled,
    filteredLanguages,
    onAddLanguageFilter,
    onChangeIsLanguagesFilled,
    resetFilteredLanguages
  } = useLanguagesFilter(tableData);

  const handleChangeContentType = React.useCallback(
    (contentType: string | number | string[] | boolean) => {
      push(`/${brandId}/content/${contentType}`);
    },
    [brandId, push]
  );
  const handleChangeStatus = React.useCallback(
    (status: string | number | string[] | boolean) => setStatus(status as ContentStatus),
    []
  );

  React.useEffect(() => {
    const requestedStatus = status !== "all" ? status : undefined;
    const fetchContentPromise = dispatch(fetchContent({ brandId, contentType, status: requestedStatus }));
    resetFilteredLanguages();

    return () => {
      fetchContentPromise.abort();
    };
  }, [dispatch, brandId, contentType, status, resetFilteredLanguages]);

  React.useEffect(() => {
    return () => {
      dispatch(resetContentState());
    };
  }, [dispatch, contentType]);

  const handleOpenCreateContent = React.useCallback(
    (contentType: ContentType) => {
      push(`/${brandId}/content/${contentType}/new`);
    },
    [push, brandId]
  );

  const handleOpenDetails = React.useCallback(
    ({ original }: Row<ContentRow>) => {
      push(`/${brandId}/content/${contentType}/${original.id}?language=en`);
    },
    [push, brandId, contentType]
  );

  const columns = React.useMemo(
    () => [
      { Header: "Name/ID", accessor: "name", Cell: NameCell },
      { Header: "", accessor: "contentForSearch", width: 0, Cell: () => null },
      { Header: "Languages", accessor: "languages", width: 90, Cell: LanguageCell },
      { Header: "Status", accessor: "status", width: 90, Cell: StatusCell },
      { Header: "Updated", accessor: "updatedAt", width: 90, Cell: DateTimeCell },
      {
        Header: "",
        width: 15,
        id: "showMore",
        Cell: ({ cell }: CellProps<ContentRow>) => <ShowMoreCell cell={cell} contentType={contentType} />
      }
    ],
    [contentType]
  );

  return (
    <PageLayout
      fabButtonProps={{
        title: "Create new content",
        onClick: () => handleOpenCreateContent(contentType)
      }}
    >
      <StyledPage>
        <Table
          columns={columns as Column<ContentRow>[]}
          data={filteredData}
          onRowClick={handleOpenDetails}
          isLoading={isLoading}
          dimmedParameter={{ property: "active", not: true }}
        >
          <div className="control-tabs">
            <Tabs value={contentType} onChange={handleChangeContentType}>
              <Tab value={CONTENT_TYPES.email}>Mailer</Tab>
              <Tab value={CONTENT_TYPES.sms}>Message</Tab>
              <Tab value={CONTENT_TYPES.notification}>Notification</Tab>
            </Tabs>
            <div className="control-tabs__right-panel">
              <LanguagesFilter
                isLanguagesFilled={isLanguagesFilled}
                filteredLanguages={filteredLanguages}
                onAddLanguageFilter={onAddLanguageFilter}
                onChangeIsLanguagesFilled={onChangeIsLanguagesFilled}
              />

              <Tabs value={status} onChange={handleChangeStatus}>
                <Tab value="all">All</Tab>
                <Tab value="draft">Draft</Tab>
                <Tab value="published">Published</Tab>
              </Tabs>
            </div>
          </div>
        </Table>
      </StyledPage>
    </PageLayout>
  );
};

export { ContentPage };
