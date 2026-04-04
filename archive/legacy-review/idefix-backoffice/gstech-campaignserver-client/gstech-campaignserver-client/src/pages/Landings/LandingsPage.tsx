import React, { FC, useCallback, useEffect, useMemo } from "react";
import { ContentRow } from "app/types";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { CellProps, Column, Row } from "react-table";
import styled from "styled-components";

import { ArrayCell, DateTimeCell, LanguageCell, PageLayout, Table } from "../../components";
import { selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import {
  fetchContent,
  selectLandingsTableData,
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

const LandingsPage: FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const { brandId } = useParams<Params>();
  const contentType = CONTENT_TYPES.landingPage;
  const tableData = useSelector(selectLandingsTableData);

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

  useEffect(() => {
    const fetchLandingsPromise = dispatch(fetchContent({ brandId, contentType, status: undefined }));
    resetFilteredLanguages();
    return () => {
      fetchLandingsPromise.abort();
    };
  }, [dispatch, contentType, brandId, resetFilteredLanguages]);

  const handleOpenCreateContent = useCallback(() => {
    push(`/${brandId}/landings/new`);
  }, [push, brandId]);

  const handleOpenDetails = useCallback(
    ({ original }: Row<ContentRow>) => {
      push(`/${brandId}/landings/${original.id}?language=en`);
    },
    [push, brandId]
  );

  useEffect(() => {
    return () => {
      dispatch(resetContentState());
    };
  }, [dispatch]);

  const columns = useMemo(
    () => [
      { Header: "ID", accessor: "externalId" },
      { Header: "Type", accessor: "subtype", width: 90 },
      { Header: "Location", accessor: "location", width: 90 },
      { Header: "Tags", accessor: "tags", width: 90, Cell: ArrayCell },
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
        title: "Create new landing",
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

export { LandingsPage };
