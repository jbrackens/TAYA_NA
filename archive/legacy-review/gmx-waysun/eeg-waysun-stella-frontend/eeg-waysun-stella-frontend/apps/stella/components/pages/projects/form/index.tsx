import React, { FC, useEffect, useState } from "react";
import { Formik, Field, Form } from "formik";
import {
  Input,
  message,
  Button,
  TextArea,
  Table,
  TableBody,
  TableRow,
  TableCol,
} from "ui";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { ButtonDiv } from "./../index.style";
import { useRouter } from "next/router";
import * as yup from "yup";
import { v4 as uuidv4 } from "uuid";

type ProjectFormProps = {
  addMode: boolean;
  projectId: string | string[] | undefined;
};

const ProjectForm: FC<ProjectFormProps> = ({
  addMode = false,
  projectId = undefined,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  //   ------> useState variables <-------
  const [projectDetails, setProjectDetails] = useState({
    projectId: projectId,
    kid: "",
    name: "",
    description: "",
    masterClients: [],
    clients: [],
  });
  const [operationId, setOperationId] = useState("");
  const [statusRequestCount, setStatusRequestCount] = useState(0);

  //   ------> API's <-------
  const getProjectById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/projects/${projectId}`, "GET");

  const putProjectById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/projects/${projectId}`, "PUT");

  const postProject: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "POST");

  const statusRequestApi: {
    data: any;
    triggerApi: any;
    error: any;
    isLoading: boolean;
    resetHookState: any;
    statusOk?: boolean;
  } = useApi(`ipm/result/${operationId}`, "GET");

  //   ------> useEffects <-------
  useEffect(() => {
    projectId && getProjectById.triggerApi();
  }, [projectId]);

  useEffect(() => {
    if (!putProjectById.data) return;
    if (putProjectById.data.status !== "ok") return;

    message.success(t("PUT_PROJECT_SUCCESS"));
  }, [putProjectById.data]);

  useEffect(() => {
    if (!postProject.data) return;
    if (postProject.data.status !== "ok") return;

    setOperationId(postProject.data.details.operationId);
  }, [postProject.data]);

  useEffect(() => {
    if (!statusRequestApi.statusOk) return;
    if (statusRequestApi.data.status !== "ok") return;

    if (
      statusRequestApi.data.details.status === "processing" &&
      statusRequestCount < 10
    ) {
      statusRequestApi.resetHookState();
      setTimeout(() => {
        statusRequestApi.triggerApi();
        setStatusRequestCount(statusRequestCount + 1);
      }, 1000);
    } else {
      message.error(t("POST_PROJECT_TIMEOUT"));
    }

    if (statusRequestApi.data?.status === "done") {
      message.success(t("POST_PROJECT_SUCCESS"));
      router.push(`/projects/${postProject.data.details.id}`, undefined, {
        shallow: true,
      });
      setOperationId("");
      setStatusRequestCount(0);
      postProject.resetHookState();
      statusRequestApi.resetHookState();
    }
  }, [statusRequestApi.statusOk]);

  useEffect(() => {
    if (operationId && operationId.length > 0) {
      statusRequestApi.triggerApi();
    }
  }, [operationId]);

  useEffect(() => {
    if (!getProjectById.data) return;
    if (getProjectById.data.status !== "ok") return;

    const project = getProjectById.data.details;
    setProjectDetails({
      projectId: projectId,
      kid: project.kid,
      name: project.name,
      description: project.description,
      masterClients: project.clients.master,
      clients: project.clients.additional,
    });
  }, [getProjectById.data]);

  useEffect(() => {
    if (getProjectById.error) {
      message.error(t(getProjectById.error?.payload?.details?.errorCodes[0]));
      return;
    }
    if (putProjectById.error) {
      message.error(t("PUT_PROJECT_FAIL"));
      return;
    }
    if (postProject.error) {
      message.error(t("POST_PROJECT_FAIL"));
      return;
    }
  }, [getProjectById.error, putProjectById.error, postProject.error]);

  //   ------> Handler functions <-------
  const submitProjectHandler = (values) => {
    if (addMode) {
      const payload = {
        operationId: uuidv4(),
        payload: {
          name: values.name,
          description: values.description,
        },
      };

      postProject.triggerApi(payload);

      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      kid: values.kid,
    };

    putProjectById.triggerApi(payload);
  };

  //   ------> Form schema <-------
  const validationAccountSchema = yup.object().shape({
    name: yup.string().required(t("REQUIRED_ERR")),
    description: yup.string().required(t("REQUIRED_ERR")),
  });

  const generateClientsTable = (data) => {
    if (!data.length) return;

    const clients = data.map((client) => (
      <TableRow key={client.clientId}>
        <TableCol>{client.name}</TableCol>
        <TableCol>{client.clientId}</TableCol>
      </TableRow>
    ));

    return (
      <>
        <Table stripped>
          <TableBody>{clients}</TableBody>
        </Table>
      </>
    );
  };

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={projectDetails}
        validationSchema={validationAccountSchema}
        onSubmit={submitProjectHandler}
      >
        {({ errors, touched, setFieldValue }) => (
          <Form>
            <PageContentWrapper
              title={projectId ? t("PROJECT_TITLE") : t("CREATE_PROJECT_TITLE")}
              sections={[
                {
                  id: "0",
                  title: t("PROJECT_ID"),
                  isHidden: addMode,
                  content: (
                    <Field
                      id="projectId"
                      name="projectId"
                      as={Input}
                      fullWidth
                      error={
                        errors.projectId && touched.projectId
                          ? errors.projectId
                          : ""
                      }
                      disabled
                      loading={getProjectById.isLoading}
                    />
                  ),
                },
                {
                  id: "1",
                  title: t("KID"),
                  isHidden: addMode,
                  content: (
                    <Field
                      id="kid"
                      name="kid"
                      as={Input}
                      fullWidth
                      error={errors.kid && touched.kid ? errors.kid : ""}
                      loading={getProjectById.isLoading}
                      disabled
                    />
                  ),
                },
                {
                  id: "2",
                  title: t("NAME"),
                  content: (
                    <Field
                      id="name"
                      name="name"
                      as={Input}
                      fullWidth
                      error={errors.name && touched.name ? errors.name : ""}
                      loading={getProjectById.isLoading}
                    />
                  ),
                },
                {
                  id: "3",
                  title: t("DESCRIPTION"),
                  content: (
                    <Field
                      id="description"
                      name="description"
                      as={TextArea}
                      error={
                        errors.description && touched.description
                          ? errors.description
                          : ""
                      }
                      fullWidth
                      loading={getProjectById.isLoading}
                    />
                  ),
                },
                {
                  id: "5",
                  content: (
                    <ButtonDiv>
                      <Button
                        type="submit"
                        loading={
                          putProjectById.isLoading || postProject.isLoading
                        }
                      >
                        {t("SAVE")}
                      </Button>
                    </ButtonDiv>
                  ),
                },
                {
                  id: "6",
                  title: t("MASTER_CLIENTS"),
                  content: generateClientsTable(projectDetails.masterClients),
                  isHidden: !!!projectDetails.masterClients.length,
                },
                {
                  id: "7",
                  title: t("CLIENTS"),
                  content: generateClientsTable(projectDetails.clients),
                  isHidden: !!!projectDetails.clients.length,
                },
              ]}
            />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ProjectForm;
