import React, { FC } from "react";
import { useRouter } from "next/router";
import { ListSiderComponent } from "../../../list-sider";
import { useTranslation } from "next-export-i18n";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type AchievementsListComponentProps = {
  list: Array<any>;
  loading?: boolean;
};

export const AchievementsListComponent: FC<AchievementsListComponentProps> = ({
  list,
  loading = false,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const achievementId = router.query.id;
  const currentProjectId = useSelector(getProjectId);

  return (
    <ListSiderComponent
      list={list}
      title={t("ADD_ACHIEVEMENT")}
      addUrl={"/rule-configuration/achievements/add"}
      selectedId={typeof achievementId === "string" ? achievementId : ""}
      elementUrl={"/rule-configuration/achievements/"}
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
