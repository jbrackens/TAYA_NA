import React, { FC, useContext, useEffect, useState } from "react";
import { Modal, Transfer, Button, message } from "ui";
import { useTranslation } from "next-export-i18n";
import { ModalContentProject, ProjectButtonDiv } from "./../index.style";
import { UserIdContext } from "./../userIdContext";
import { useApi } from "../../../../services/api-service";

type ProjectModalprops = {
  show: boolean;
  close: () => void;
  modifyUser: (payload) => void;
  loading?: boolean;
};

const ProjectModal: FC<ProjectModalprops> = ({
  show,
  close,
  modifyUser,
  loading,
}) => {
  const { t } = useTranslation();
  const { currentUserDetails } = useContext(UserIdContext);

  const [availableProjectList, setAvailableProjectList] = useState([]);
  const [selectedProjectList, setSelectedProjectList] = useState([]);
  const [projectError, setProjectError] = useState("");

  const getProjectList: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  useEffect(() => {
    setProjectError("");
    if (show) return getProjectList.triggerApi();
  }, [show]);

  useEffect(() => {
    if (getProjectList.data && getProjectList.data.status === "ok") {
      const projectList = getProjectList.data?.details?.map((project) => ({
        key: project.projectId,
        value: project.name,
        checked: false,
      }));
      if (currentUserDetails?.projects?.length > 0) {
        setSelectedProjectList(
          projectList.filter((project) =>
            currentUserDetails?.projects.includes(project.key),
          ),
        );
        setAvailableProjectList(
          projectList.filter(
            (project) => !currentUserDetails?.projects.includes(project.key),
          ),
        );
      }
    }
  }, [getProjectList.data]);

  useEffect(() => {
    if (getProjectList.error) {
      message.error(t("FAILED"));
      getProjectList.resetHookState();
    }
  }, [getProjectList.error]);

  const closeProjectModal = () => {
    close();
  };

  const submitHandler = () => {
    if (selectedProjectList.length <= 0)
      return setProjectError(t("SELECT_PROJECT_ERR"));
    modifyUser({ projects: selectedProjectList.map((project) => project.key) });
  };

  return (
    <>
      <Modal
        modalheader={`${t("PROJECTS")} - ${currentUserDetails.username}`}
        display={show}
        onCloseButtonClicked={closeProjectModal}
      >
        <ModalContentProject>
          <Transfer
            left={availableProjectList}
            right={selectedProjectList}
            error={projectError}
            onSelectChange={() => setProjectError("")}
            onChange={(source, target) => {
              setAvailableProjectList(source);
              setSelectedProjectList(target);
              setProjectError("");
            }}
          />
          <ProjectButtonDiv>
            <Button buttonType="white-outline" onClick={closeProjectModal}>
              {t("CANCEL")}
            </Button>
            <Button onClick={submitHandler} loading={loading}>
              {t("UPDATE")}
            </Button>
          </ProjectButtonDiv>
        </ModalContentProject>
      </Modal>
    </>
  );
};

export default ProjectModal;
