import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useApi } from "../../../services/api/api-service";
import UsersDetailsWalletsList from "../../../components/users/wallet";
import {
  getUserWalletSucceeded,
  selectWalletTableMeta,
  selectWalletData,
  getUserWallet,
} from "../../../lib/slices/usersDetailsSlice";
import { Method, Id, WalletProductEnum, useTimezone } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import {
  TablePagination,
  TableFilters,
  TableSorting,
} from "../../../types/filters";
import dayjs from "dayjs";
import { addQueryParam } from "../../../utils/queryParams";

type UsersDetailsWalletsContainerProps = {
  id: Id;
};

const UsersDetailsWalletsContainer = ({
  id,
}: UsersDetailsWalletsContainerProps) => {
  const dispatch = useDispatch();
  const records = useSelector(selectWalletData);
  const { paginationResponse } = useSelector(selectWalletTableMeta);
  const [triggerWalletApi, isLoading] = useApi(
    "admin/punters/:id/transactions",
    Method.GET,
    getUserWalletSucceeded,
  );

  const router = useRouter();

  const { getTimeWithTimezone } = useTimezone();

  const { p, limit, category, product, since, until } = router.query as {
    p?: number;
    limit?: number;
    category?: Array<string>;
    product?: Array<WalletProductEnum>;
    since?: string;
    until?: string;
  };
  const filterSince = since
    ? getTimeWithTimezone(dayjs(since)).format("YYYY-MM-DDTHH:mm:ssZ")
    : undefined;

  const filterUntil = until
    ? getTimeWithTimezone(dayjs(until))
        .endOf("day")
        .format("YYYY-MM-DDTHH:mm:ssZ")
    : undefined;

  const filterCategory = category ? category : undefined;
  const filterProduct = product ? product : undefined;

  const filters = {
    category: filterCategory,
    product: filterProduct,
    since: filterSince,
    until: filterUntil,
  };

  const fetchUserWallet = async () => {
    try {
      dispatch(getUserWallet());
      await triggerWalletApi(undefined, {
        id,
        query: {
          pagination: {
            currentPage: p ? p : 1,
            itemsPerPage: limit ? limit : 20,
          },
          filters,
        },
      });
    } catch (err) {
      console.error({ err });
    }
  };

  useEffect((): any => {
    fetchUserWallet();
  }, [p, limit, category, product, since, until]);

  const handleTableChange = (
    pagination: TablePagination,
    filters: TableFilters,
    _sorting: TableSorting,
  ) => {
    const params: any = {
      ...(pagination.current && { p: pagination.current }),
      ...(pagination.pageSize && { limit: pagination.pageSize }),
      ...(!!filters.createdAt?.length && { since: filters.createdAt[0].since }),
      ...(!!filters.createdAt?.length && { until: filters.createdAt[0].until }),
      category: filters.category,
      product: filters.product,
    };
    addQueryParam(params, router);
  };

  return (
    <UsersDetailsWalletsList
      data={records}
      pagination={paginationResponse}
      isLoading={isLoading}
      handleTableChange={handleTableChange}
      punterId={id}
      triggerWalletApi={fetchUserWallet}
    />
  );
};

export default UsersDetailsWalletsContainer;
