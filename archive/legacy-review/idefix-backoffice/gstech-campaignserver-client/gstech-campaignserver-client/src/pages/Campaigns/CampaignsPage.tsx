import * as React from "react";
import styled from "styled-components";
import { useHistory, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { CampaignStatus } from "app/types";
import { Column } from "react-table";

import { fetchCampaigns, selectCampaigns, selectLoading, setLoading } from "./campaignsSlice";
import { PageLayout, Table, Tab, Tabs, DateTimeCell } from "../../components";
import { ShowMoreCell } from "./components/ShowMoreCell";
import { NameCell } from "./components/NameCell";
import { selectVisibilityFilter, changeFilter } from "./visibilityFilterSlice";
import { AppDispatch, RootState } from "../../redux";
import { ExpandCell } from "./components/ExpandCell";

const StyledPage = styled.div`
  .table-controls {
    justify-content: space-between;
  }
`;
interface Params {
  brandId: string;
}

const CampaignsPage = () => {
  const dispatch: AppDispatch = useDispatch();
  const { push } = useHistory();
  const { brandId } = useParams<Params>();

  const visibilityFilter = useSelector(selectVisibilityFilter);
  const campaigns = useSelector((state: RootState) => selectCampaigns(state, brandId));
  const isLoading = useSelector(selectLoading);

  const handleChangeFilter = React.useCallback(
    (newFilter: string | number | string[] | boolean) => dispatch(changeFilter(newFilter as CampaignStatus)),
    [dispatch]
  );

  React.useEffect(() => {
    const fetchCampaignsPromise = dispatch(fetchCampaigns(brandId));
    return () => {
      fetchCampaignsPromise.abort();
    };
  }, [dispatch, visibilityFilter, brandId]);

  React.useEffect(() => {
    return () => {
      dispatch(setLoading(true));
    };
  }, [dispatch]);

  const columns: Array<Column> = React.useMemo(
    () => [
      {
        Header: "",
        id: "expander",
        width: 12,
        disableGlobalFilter: true,
        Cell: ExpandCell
      },
      {
        Header: "Name",
        accessor: "name",
        Cell: NameCell
      },
      {
        width: 0,
        accessor: "campaignTitles",
        Cell: () => null
      },
      {
        Header: "Start Time",
        accessor: "startTime",
        width: 100,
        Cell: props => <DateTimeCell {...props} withMaltaTZ={true} />
      },
      {
        Header: "End Time",
        accessor: "endTime",
        width: 100,
        Cell: props => <DateTimeCell {...props} withMaltaTZ={true} />
      },
      {
        Header: "",
        width: 30,
        id: "showMore",
        Cell: ShowMoreCell
      }
    ],
    []
  );

  const data = React.useMemo(() => campaigns, [campaigns]);

  const handleRowClick = React.useCallback(
    row => {
      const { original } = row;

      if (original.subRows) {
        return push(`/${brandId}/campaigns/${original.subRows[0].id}/edit`);
      }

      return push(`/${brandId}/campaigns/${original.id}/edit`);
    },
    [push, brandId]
  );

  const handleCreateNewCampaign = React.useCallback(() => {
    push(`/${brandId}/campaigns/new`);
  }, [push, brandId]);

  return (
    <PageLayout
      fabButtonProps={{
        title: "Create new campaign",
        onClick: handleCreateNewCampaign
      }}
    >
      <StyledPage>
        <Table columns={columns} data={data} onRowClick={handleRowClick} isLoading={isLoading}>
          <Tabs value={visibilityFilter} onChange={handleChangeFilter}>
            <Tab value="active">Active</Tab>
            <Tab value="draft">Draft</Tab>
            <Tab value="archived">Archive</Tab>
          </Tabs>
        </Table>
      </StyledPage>
    </PageLayout>
  );
};

export { CampaignsPage };
