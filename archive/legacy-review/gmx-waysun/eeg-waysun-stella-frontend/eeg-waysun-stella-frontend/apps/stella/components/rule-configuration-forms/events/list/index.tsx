import React, { FC } from "react";
import { useRouter } from "next/router";
import { ListSiderComponent } from "../../../list-sider";
import { useTranslation } from "next-export-i18n";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type EventsListComponentProps = {
  list: Array<any>;
  loading?: boolean;
};

const EventsListComponent: FC<EventsListComponentProps> = ({
  list,
  loading = false,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const eventId = router.query.id;
  const currentProjectId = useSelector(getProjectId);

  return (
    <ListSiderComponent
      list={list}
      title={t("ADD_EVENT")}
      addUrl={"/rule-configuration/events/add"}
      selectedId={typeof eventId === "string" ? eventId : ""}
      elementUrl={"/rule-configuration/events/"}
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

export default EventsListComponent;
