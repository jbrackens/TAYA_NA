import * as React from "react";
import { ContentRow } from "app/types";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { CellProps, Column, Row } from "react-table";
import styled from "styled-components";

import { ArrayCell, DateCell, DateTimeCell, PageLayout, Table } from "../../components";
import { selectBrandSettingsIsLoading, selectSettingsIsLoading } from "../../modules/app";
import {
  selectTournamentsTableData,
  selectIsLoading,
  resetContentState,
  ShowMoreCell,
  fetchContent
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

const TournamentsPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const { brandId } = useParams<Params>();
  const contentType = CONTENT_TYPES.tournament;
  const tableData = useSelector(selectTournamentsTableData);

  const isLoadingLandings = useSelector(selectIsLoading);
  const isLoadingSettings = useSelector(selectSettingsIsLoading);
  const isLoadingBrandSettings = useSelector(selectBrandSettingsIsLoading);
  const isLoading = isLoadingLandings || isLoadingSettings || isLoadingBrandSettings;

  const handleOpenCreateContent = React.useCallback(() => {
    push(`/${brandId}/tournaments/new`);
  }, [push, brandId]);

  const handleOpenDetails = React.useCallback(
    ({ original }: Row<ContentRow>) => {
      push(`/${brandId}/tournaments/${original.id}?language=en`);
    },
    [push, brandId]
  );

  React.useEffect(() => {
    return () => {
      dispatch(resetContentState());
    };
  }, [dispatch]);

  React.useEffect(() => {
    const fetchTournamentsPromise = dispatch(
      fetchContent({ brandId, contentType, status: undefined, excludeInactive: false })
    );
    return () => {
      fetchTournamentsPromise.abort();
    };
  }, [dispatch, contentType, brandId]);

  const columns = React.useMemo(
    () => [
      { Header: "ID", accessor: "name" },
      { Header: "Type", accessor: "subtype", width: 90 },
      { Header: "Start date", accessor: "startDate", width: 90, Cell: DateCell },
      { Header: "End date", accessor: "endDate", width: 90, Cell: DateCell },
      { Header: "Brands", accessor: "brands", width: 90, Cell: ArrayCell },
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
        title: "Create new tournament",
        onClick: handleOpenCreateContent
      }}
    >
      <StyledPage>
        <Table
          columns={columns as Column<ContentRow>[]}
          data={tableData}
          onRowClick={handleOpenDetails}
          isLoading={isLoading}
          dimmedParameter={{ property: "active", not: true }}
        ></Table>
      </StyledPage>
    </PageLayout>
  );
};

export { TournamentsPage };
