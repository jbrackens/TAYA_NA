import React, { FC, useContext, useEffect, useState } from "react";
import { Modal, MainList, TextArea, Button, message } from "ui";
import { useTranslation } from "next-export-i18n";
import {
  ModalContentFlex,
  FixedDivs,
  ContextList,
  ProjectButtonDiv,
  ProjectLabel,
} from "./../index.style";
import { UserIdContext } from "./../userIdContext";
import { useApi } from "../../../../services/api-service";

type ContextModalprops = {
  show: boolean;
  close: () => void;
};

const ContextModal: FC<ContextModalprops> = ({ show, close }) => {
  const { t } = useTranslation();
  const { currentUserDetails, currentUserId } = useContext(UserIdContext);

  const [projectList, setProjectList] = useState([{}, {}]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [textAreaValue, setTextAreaValue] = useState("");
  const [contextError, setContextError] = useState("");

  const getProjectList: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  const getContext: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`user_context/admin/${selectedProjectId}/${currentUserId}`, "GET");

  const patchContext: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `user_context/admin/${selectedProjectId}/${currentUserId}`,
    "PATCH",
  );

  useEffect(() => {
    if (show) return getProjectList.triggerApi();
  }, [show]);

  useEffect(() => {
    if (selectedProjectId) return getContext.triggerApi();
  }, [selectedProjectId]);

  useEffect(() => {
    if (getContext.data)
      return setTextAreaValue(JSON.stringify(getContext.data.details, null, 3));
  }, [getContext.data]);

  useEffect(() => {
    if (getProjectList.data && getProjectList.data.status === "ok") {
      const userProjects = getProjectList.data?.details.filter((project) =>
        currentUserDetails.projects.includes(project.projectId),
      );
      setProjectList(
        userProjects.map((project) => ({
          key: project.projectId,
          value: project.name,
          variant: "none",
        })),
      );
    }
  }, [getProjectList.data]);

  const closeModal = () => {
    setSelectedProjectId("");
    setTextAreaValue(null);
    close();
  };

  const saveContextData = () => {
    try {
      const objectVal = JSON.parse(textAreaValue);
      typeof objectVal === "object" && patchContext.triggerApi(objectVal);
      message.success(t("SEND"));
    } catch (error) {
      setContextError(t("WRONG_JSON_FORMAT"));
      message.error(t("WRONG_JSON_FORMAT"));
    }
  };

  return (
    <>
      <Modal
        modalheader={t("USER_CONTEXT_HEADER")}
        display={show}
        onCloseButtonClicked={closeModal}
        contentPadding={0}
      >
        <ModalContentFlex>
          <ContextList>
            <ProjectLabel>{t("PROJECTS")}</ProjectLabel>
            <MainList
              fullWidth
              data={projectList}
              onClick={(value) => setSelectedProjectId(value)}
              loading={getProjectList.isLoading}
              selectedKey={selectedProjectId}
            />
          </ContextList>
          <FixedDivs>
            <TextArea
              fullWidth
              loading={getContext.isLoading}
              onChange={(e) => setTextAreaValue(e.target.value)}
              onBlur={() => setContextError("")}
              value={textAreaValue || ""}
              rows={10}
              error={contextError}
              disabled={!selectedProjectId}
            />
          </FixedDivs>
        </ModalContentFlex>
        <ProjectButtonDiv>
          <Button buttonType="white-outline" onClick={closeModal}>
            {t("CLOSE")}
          </Button>
          <Button
            onClick={saveContextData}
            loading={patchContext.isLoading}
            disabled={!selectedProjectId}
          >
            {t("SAVE")}
          </Button>
        </ProjectButtonDiv>
      </Modal>
    </>
  );
};

export default ContextModal;
