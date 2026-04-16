import React, { useEffect, useState } from "react";
import { Method } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import {
  clearMarketCategories,
  getMarketCategoriesSucceeded,
  selectMarketCategoriesData,
  selectMarketCategoriesTableMeta,
} from "../../../lib/slices/marketCategoriesSlice";
import { useApi } from "../../../services/api/api-service";
import { Button, Table } from "antd";
import { useTranslation } from "i18n";
import { ChangeVisibilityModal } from "../change-visibility-modal";
import { MarketVisibility } from "../../../types/market";

export type MarketCategoriesTableData = {
  name: string;
  visibility: MarketVisibility;
  key: string;
};

const MarketCategoriesList = () => {
  const router = useRouter();
  const { t } = useTranslation("page-market-categories");
  const { sport, p, limit } = router.query;
  const dispatch = useDispatch();
  const tableData: MarketCategoriesTableData[] = useSelector(
    selectMarketCategoriesData,
  ).map((el) => ({
    name: el.marketCategory,
    visibility: el.visibility,
    key: el.marketCategory,
  }));

  const [selectedMarketCategory, setSelectedMarketCategory] = useState<
    MarketCategoriesTableData | undefined
  >();

  useEffect(() => {
    return () => {
      dispatch(clearMarketCategories());
    };
  }, []);

  const [triggerCategoriesApi, isCategoriesApiLoading] = useApi(
    "admin/trading/markets/categories/:id",
    Method.GET,
    getMarketCategoriesSucceeded,
  );
  const { paginationResponse } = useSelector(selectMarketCategoriesTableMeta);

  const triggerTableApi = () => {
    if (sport) {
      triggerCategoriesApi(undefined, {
        id: sport,
        query: {
          pagination: {
            currentPage: p ? p : 1,
            itemsPerPage: limit ? limit : 20,
          },
        },
      });
    }
  };

  useEffect(() => {
    triggerTableApi();
  }, [sport, p, limit]);

  const handleTableChange = (pagination: any, _filters: any, _sorting: any) => {
    router.push(
      {
        query: {
          sport: sport,
          ...(pagination.current && { p: pagination.current }),
          ...(pagination.pageSize && { limit: pagination.pageSize }),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const columns = [
    {
      title: t("NAME_COL"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("VISIBILITY_COL"),
      dataIndex: "visibility",
      key: "visibility",
    },
    {
      title: t("ACTION_COL"),
      key: "name",
      render: (value: MarketCategoriesTableData) => {
        return (
          <Button type="link" onClick={() => setSelectedMarketCategory(value)}>
            {t("CHANGE_VISIBILITY")}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Table
        dataSource={tableData}
        columns={columns}
        loading={isCategoriesApiLoading}
        onChange={handleTableChange}
        pagination={{
          ...paginationResponse,
          pageSizeOptions: ["10", "20", "50", "100"],
          showSizeChanger: true,
        }}
      />
      <ChangeVisibilityModal
        marketCategory={selectedMarketCategory}
        clearSelectedMarketCategory={() => setSelectedMarketCategory(undefined)}
        triggerTableApi={triggerTableApi}
      />
    </>
  );
};

export default MarketCategoriesList;
