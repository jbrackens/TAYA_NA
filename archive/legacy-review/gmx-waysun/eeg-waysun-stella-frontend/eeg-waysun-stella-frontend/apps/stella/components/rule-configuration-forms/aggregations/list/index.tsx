import React, { FC } from "react";
import { useRouter } from "next/router";
import { ListSiderComponent } from "../../../list-sider";
import { useTranslation } from "next-export-i18n";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type AggregationsListComponentProps = {
  list: Array<any>;
  loading?: boolean;
};

export const AggregationsListComponent: FC<AggregationsListComponentProps> = ({
  list,
  loading = false,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const aggregationId = router.query.id;
  const currentProjectId = useSelector(getProjectId);

  return (
    <ListSiderComponent
      list={list}
      title={t("ADD_AGGREGATION")}
      addUrl={"/rule-configuration/aggregations/add"}
      selectedId={typeof aggregationId === "string" ? aggregationId : ""}
      elementUrl={"/rule-configuration/aggregations/"}
      loading={loading}
      customMessage={
        currentProjectId
          ? list.length > 0 || loading
            ? ""
            : t("LIST_NO_ITEMS")
          : t("LIST_NO_PROJECT_SELECTED")
      }
    />
  );
};
