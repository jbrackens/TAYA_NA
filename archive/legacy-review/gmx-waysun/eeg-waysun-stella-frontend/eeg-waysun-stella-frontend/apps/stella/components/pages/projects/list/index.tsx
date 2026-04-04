import React, { useEffect, useState } from "react";
import { ListSiderComponent } from "../../../list-sider";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { message } from "ui";

const ProjectList = ({ projectId }) => {
  const { t } = useTranslation();
  const [listElements, setListElements] = useState([]);
  const getProjects: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  useEffect(() => {
    getProjects.triggerApi();
  }, []);

  useEffect(() => {
    if (getProjects.data && getProjects.data?.status === "ok") {
      setListElements(
        getProjects.data.details.map((projectData) => {
          return {
            title: projectData.name,
            id: projectData.projectId,
            variant: "none",
          };
        }),
      );
    }
  }, [getProjects.data]);

  useEffect(() => {
    if (getProjects.error) {
      message.error(t("PROJECT_FETCH_FAILED"));
    }
  }, [getProjects.error]);

  return (
    <ListSiderComponent
      title={t("ADD_PROJECT")}
      list={listElements}
      elementUrl="/projects/"
      addUrl="/projects/add"
      selectedId={projectId}
      hideSearchSection
      loading={getProjects.isLoading}
    />
  );
};

export default ProjectList;
