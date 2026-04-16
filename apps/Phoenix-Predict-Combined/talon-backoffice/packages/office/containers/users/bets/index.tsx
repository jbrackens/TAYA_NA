import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useApi } from "../../../services/api/api-service";
import UsersDetailsBetsList from "../../../components/users/bets";
import {
  getUserBetsSucceeded,
  selectBetsTableMeta,
  selectBetsData,
  getUserBets,
} from "../../../lib/slices/usersDetailsSlice";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";

type UsersDetailsBetsContainerProps = {
  id: string | string[] | number | undefined;
};

const UsersDetailsBetsContainer = ({ id }: UsersDetailsBetsContainerProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectBetsData);
  const { paginationResponse } = useSelector(selectBetsTableMeta);

  const router = useRouter();

  const { p, limit } = router.query as {
    p?: number;
    limit?: number;
  };

  const [triggerBetsApi, isLoading] = useApi(
    "admin/punters/:id/bets",
    Method.GET,
    getUserBetsSucceeded,
  );
  const [refreshData, setRefreshData] = useState(false);

  useEffect((): any => {
    const fetchUserBets = async () => {
      try {
        dispatch(getUserBets());
        await triggerBetsApi(undefined, {
          id,
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
    fetchUserBets();
    setRefreshData(false);
  }, [p, limit, refreshData]);

  const setRefreshDataFunc = (refresh: boolean) => {
    setRefreshData(refresh);
  };

  const handleTableChange = (
    pagination: TablePagination,
    _filters: TableFilters,
    _sorting: TableSorting,
  ) => {
    router.push(
      {
        query: {
          ...router.query,
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  return (
    <UsersDetailsBetsList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
      setRefreshDataFunc={setRefreshDataFunc}
    />
  );
};

export default UsersDetailsBetsContainer;
