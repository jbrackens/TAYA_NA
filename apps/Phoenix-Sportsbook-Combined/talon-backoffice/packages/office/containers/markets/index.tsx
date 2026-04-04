import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getMarketsList,
  getMarketsListSucceeded,
  selectData,
  selectTableMeta,
} from "../../lib/slices/marketsSlice";
import MarketsList from "../../components/markets/list";
import { useApi } from "../../services/api/api-service";
import { TableMetaSelector } from "../../types/filters";
import { TalonSingleMarketFixture } from "../../types/market.d";
import { Method } from "@phoenix-ui/utils";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../types/filters";
import { useRouter } from "next/router";

const MarketsContainer = () => {
  const dispatch = useDispatch();
  const records: TalonSingleMarketFixture[] = useSelector(selectData);
  const { paginationResponse }: TableMetaSelector = useSelector(
    selectTableMeta,
  );
  const [triggerMarketsListApi, isLoading] = useApi(
    "admin/markets",
    Method.GET,
    getMarketsListSucceeded,
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
    const fetchMarkets = async () => {
      try {
        dispatch(getMarketsList());
        await triggerMarketsListApi(undefined, {
          query: {
            page: p ? p : 1,
            limit: limit ? limit : 20,
          },
        });
      } catch (err) {
        console.error({ err });
      }
    };
    fetchMarkets();
  }, [p, limit]);

  return (
    <MarketsList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
    />
  );
};

export default MarketsContainer;
