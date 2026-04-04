import React, { FC, useEffect, useState } from "react";
import { ListSiderHeadingSection, ListSiderSelect } from "./index.styled";
import { Select } from "ui";
import { ProjectGetResponseType } from "utils";
import { useApi } from "../../../../services/api-service";
import { setProject, getProject } from "./../../../../lib/slices/appDataSlice";
import { useDispatch, useSelector } from "react-redux";
import { Header } from "ui";
import { useTranslation } from "next-export-i18n";

type ListSiderHeaderSectionProps = {
  headerText: string;
};

export const ListSiderHeaderSection: FC<ListSiderHeaderSectionProps> = ({
  headerText = "Configuration",
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [selectedProject, setSelectedProject] = useState(
    useSelector(getProject),
  );
  const [projectDetails, setprojectDetails] = useState(
    selectedProject !== null ? [selectedProject] : [],
  );

  const getProjectList: {
    data: ProjectGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    statusOk?: boolean;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  useEffect(() => {
    getProjectList.triggerApi();
  }, []);

  useEffect(() => {
    if (getProjectList.statusOk) {
      const projectList = getProjectList.data.details.map((projectDetails) => {
        return {
          key: projectDetails.projectId,
          value: projectDetails.name,
        };
      });
      setprojectDetails(projectList);
    }
  }, [getProjectList.statusOk]);

  const projectSelectOptionChanged = (key: string, value: string) => {
    const selected = { key, value };
    setSelectedProject(selected);
    dispatch(setProject(selected));
  };

  return (
    <ListSiderHeadingSection>
      <Header type="h6" size="small" customFontSize={18}>
        {headerText}
      </Header>
      <ListSiderSelect>
        <Select
          options={projectDetails}
          selectedKey={selectedProject?.key}
          onOptionChange={projectSelectOptionChanged}
          loadingOptions={getProjectList.isLoading}
          optionFullWidth
          value={t("SELECT_PROJECT")}
        />
      </ListSiderSelect>
    </ListSiderHeadingSection>
  );
};
