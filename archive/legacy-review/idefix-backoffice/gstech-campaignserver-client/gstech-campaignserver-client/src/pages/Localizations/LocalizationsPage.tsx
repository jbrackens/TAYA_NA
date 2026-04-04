import * as React from "react";
import { ContentRow } from "app/types";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { CellProps, Column, Row } from "react-table";
import styled from "styled-components";

import { ArrayCell, DateTimeCell, LanguageCell, PageLayout, Table } from "../../components";
import { selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import {
  fetchContent,
  selectLocalizationsTableData,
  selectIsLoading,
  resetContentState,
  useLanguagesFilter,
  LanguagesFilter,
  ShowMoreCell
} from "../../modules/content";
import { AppDispatch } from "../../redux";
import { CONTENT_TYPES } from "../../utils/constants";

const StyledPage = styled.div`
  .table-controls {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }
`;

interface Params {
  brandId: string;
}

const LocalizationsPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const { brandId } = useParams<Params>();
  const contentType = CONTENT_TYPES.localization;
  const tableData = useSelector(selectLocalizationsTableData);

  const isLoadingLandings = useSelector(selectIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);
  const isLoading = isLoadingLandings || isLoadingSettings || isLoadingBrandSettings;

  const {
    filteredData,
    isLanguagesFilled,
    filteredLanguages,
    onAddLanguageFilter,
    onChangeIsLanguagesFilled,
    resetFilteredLanguages
  } = useLanguagesFilter(tableData);

  React.useEffect(() => {
    const fetchLandingsPromise = dispatch(fetchContent({ brandId, contentType, status: undefined }));
    resetFilteredLanguages();
    return () => {
      fetchLandingsPromise.abort();
    };
  }, [dispatch, contentType, brandId, resetFilteredLanguages]);

  const handleOpenCreateContent = React.useCallback(() => {
    push(`/${brandId}/localizations/new`);
  }, [push, brandId]);

  const handleOpenDetails = React.useCallback(
    ({ original }: Row<ContentRow>) => {
      push(`/${brandId}/localizations/${original.id}?language=en`);
    },
    [push, brandId]
  );

  React.useEffect(() => {
    return () => {
      dispatch(resetContentState());
    };
  }, [dispatch]);

  const columns = React.useMemo(
    () => [
      { Header: "ID", accessor: "name" },
      { Header: "Brands", accessor: "brands", Cell: ArrayCell },
      { Header: "Text", accessor: "text", width: 300 },
      { Header: "Languages", accessor: "languages", Cell: LanguageCell },
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
        title: "Create new localization",
        onClick: handleOpenCreateContent
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
          <LanguagesFilter
            isLanguagesFilled={isLanguagesFilled}
            filteredLanguages={filteredLanguages}
            onAddLanguageFilter={onAddLanguageFilter}
            onChangeIsLanguagesFilled={onChangeIsLanguagesFilled}
          />
        </Table>
      </StyledPage>
    </PageLayout>
  );
};

export { LocalizationsPage };
