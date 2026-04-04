import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getFixturesList,
  getFixturesListSucceeded,
  selectData,
  selectTableMeta,
} from "../../lib/slices/fixturesSlice";
import FixturesList from "../../components/fixtures/list";
import { useApi } from "../../services/api/api-service";
import { TableMetaSelector } from "../../types/filters";
import { TalonFixture } from "../../types/fixture.d";
import { Method } from "@phoenix-ui/utils";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../types/filters";
import { useRouter } from "next/router";

const FixturesContainer = () => {
  const dispatch = useDispatch();
  const records: TalonFixture[] = useSelector(selectData);
  const { paginationResponse }: TableMetaSelector = useSelector(
    selectTableMeta,
  );
  const [triggerFixturesListApi, isLoading] = useApi(
    "admin/trading/fixtures",
    Method.GET,
    getFixturesListSucceeded,
  );

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const handleTableChange = (
    pagination: TablePagination,
    _filters: TableFilters,
    _sorting: TableSorting,
  ) => {
    router.push(
      {
        query: {
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        dispatch(getFixturesList());
        await triggerFixturesListApi(undefined, {
          query: {
            pagination: {
              currentPage: p ? p : 1,
              itemsPerPage: limit ? limit : 20,
            },
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchFixtures();
  }, [p, limit]);

  return (
    <FixturesList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default FixturesContainer;
