import React, { FC, useEffect, useState } from "react";
import { Formik, Field, Form } from "formik";
import { Input, message, Transfer, Button, Radio, Select, Link } from "ui";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import {
  ButtonDiv,
  ButtonDivSpaceAbove,
  InputWithButtonField,
  InputButton,
} from "./../index.style";
import { useRouter } from "next/router";
import * as yup from "yup";
import {
  PlusOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";

type ClientFormProps = {
  addMode: boolean;
  clientUuid: string | string[] | undefined;
};

const clientTypeOptions = [
  {
    name: "Public",
    value: "public",
  },
  {
    name: "Private",
    value: "private",
  },
];

const ClientForm: FC<ClientFormProps> = ({
  addMode = false,
  clientUuid = undefined,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  //   ------> useState variables <-------
  const [availableProjectList, setAvailableProjectList] = useState([]);
  const [selectedProjectList, setSelectedProjectList] = useState([]);
  const [availablePermissionList, setAvailablePermissionList] = useState([]);
  const [viewSecret, setViewSecret] = useState(false);
  const [socialSelectList, setSocialSelectList] = useState([]);
  const [clientDetails, setClientDetails] = useState({
    clientId: "",
    clientType: "",
    clientSecret: "",
    socialAuthentication: "",
    redirectUris: [],
    projects: [],
    permissions: [],
  });

  //   ------> API's <-------
  const getClientById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/oauth2/clients/${clientUuid}`, "GET");

  const getSocial: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/oauth2/social", "GET");

  const getProjectList: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  const getPermissions: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/permissions", "GET");

  const patchClientById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`ipm/oauth2/clients/${clientUuid}`, "PUT");

  const postClient: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/oauth2/clients", "POST");

  //   ------> useEffects <-------
  useEffect(() => {
    getSocial.triggerApi();
  }, []);

  useEffect(() => {
    clientUuid && getClientById.triggerApi();
  }, [clientUuid]);

  useEffect(() => {
    if (!addMode) return;
    getProjectList.triggerApi();
    getPermissions.triggerApi();
  }, [addMode]);

  useEffect(() => {
    if (getSocial.data && getSocial.data.status === "ok") {
      setSocialSelectList(
        getSocial.data.details.map((social) => ({
          key: social.socialClientId,
          value: social.socialId,
        })),
      );
    }
  }, [getSocial.data]);

  useEffect(() => {
    if (getClientById.data && getClientById.data.status === "ok") {
      getProjectList.triggerApi();
      getPermissions.triggerApi();
      const client = getClientById.data.details;
      if (!client.clientId) {
        message.error(t(`${t("GET_CLIENT")} - ${t("FAILED")}`));
        getClientById.resetHookState;
      } else {
        setClientDetails({
          clientId: client.clientId,
          clientType: client.clientType,
          clientSecret: client.clientSecret,
          socialAuthentication: client.socialAuthentication,
          redirectUris: client.redirectUris,
          projects: client.projects,
          permissions: client.permissions?.map((permission) => ({
            value: permission,
            key: permission,
            checked: false,
          })),
        });
      }
    }
  }, [getClientById.data]);

  useEffect(() => {
    if (getProjectList.data && getProjectList.data.status === "ok") {
      const projectList = getProjectList.data.details;
      let selectedProjects = [],
        availableProjects = projectList?.map((project) => ({
          value: project.name,
          key: project.projectId,
          checked: false,
        }));
      if (clientDetails.projects?.length > 0) {
        clientDetails.projects.forEach((projectId) => {
          const selectedProjectItem = projectList.find(
            (project) => project.projectId === projectId,
          );
          if (selectedProjectItem) {
            selectedProjects.push({
              value: selectedProjectItem?.name,
              key: selectedProjectItem?.projectId,
              checked: false,
            });
          }
        });
      }
      setAvailableProjectList(
        availableProjects.filter(
          (listItem) => !clientDetails.projects?.includes(listItem.key),
        ),
      );
      setSelectedProjectList(selectedProjects);
    }
  }, [getProjectList.data]);

  useEffect(() => {
    if (getPermissions.data && getPermissions.data.status === "ok") {
      let availableProjects = getPermissions.data?.details?.map(
        (permission) => ({
          value: permission,
          key: permission,
          checked: false,
        }),
      );
      setAvailablePermissionList(
        availableProjects.filter(
          (listItem) => !clientDetails.permissions?.includes(listItem.key),
        ),
      );
    }
  }, [getPermissions.data]);

  useEffect(() => {
    if (getClientById.error) {
      message.error(
        t(
          `${t("GET_CLIENT")} - ${
            getClientById.error?.payload?.details?.[0]?.msg || t("FAILED")
          }`,
        ),
      );
      getClientById.resetHookState();
      return;
    }
    if (getProjectList.error) {
      message.error(
        t(
          `${t("GET_PROJECT")} - ${
            getProjectList.error?.payload?.details?.errorCodes[0] || t("FAILED")
          }`,
        ),
      );
      getProjectList.resetHookState();
      return;
    }
    if (patchClientById.error) {
      message.error(
        t(
          `${t("UPDATE_CLIENT")} - ${
            patchClientById.error?.payload?.details?.[0]?.msg || t("FAILED")
          }`,
        ),
      );
      patchClientById.resetHookState();
      return;
    }
    if (postClient.error) {
      message.error(
        t(
          `${t("CREATE_CLIENT")} - ${
            postClient.error?.payload?.details?.[0]?.msg || t("FAILED")
          }`,
        ),
      );
      postClient.resetHookState();
      return;
    }
    if (getSocial.error) {
      message.error(
        t(
          `${t("GET_SOCIAL")} - ${
            getSocial.error?.payload?.details?.[0]?.msg || t("FAILED")
          }`,
        ),
      );
      getSocial.resetHookState();
      return;
    }
  }, [
    getProjectList.error,
    getClientById.error,
    patchClientById.error,
    postClient.error,
    getSocial.error,
  ]);

  useEffect(() => {
    if (patchClientById.data && patchClientById.data.status === "ok") {
      message.success(t("PATCH_SUCCESS"));
    }
  }, [patchClientById.data]);

  useEffect(() => {
    if (postClient.data && postClient.data.status === "ok") {
      message.success(t("POST_SUCCESS"));
      router.push(`/oauth2/clients`, undefined, {
        shallow: true,
      });
    }
  }, [postClient.data]);

  //   ------> Handler functions <-------
  const submitClientHandler = (values) => {
    const payload = {
      clientId: values.clientId,
      clientType: values.clientType,
      clientSecret: values.clientSecret,
      socialAuthentication: values.socialAuthentication,
      redirectUris: values.redirectUris,
      projects: values.projects.map((project) =>
        typeof project === "string" ? project : project.key,
      ),
      permissions: values.permissions.map((permission) => permission.key),
    };
    if (clientUuid) return patchClientById.triggerApi(payload);
    if (addMode) return postClient.triggerApi(payload);
  };

  //   ------> Form schema <-------
  const validationAccountSchema = yup.object().shape({
    clientId: yup.string().required(t("REQUIRED_ERR")),
    clientType: yup.string().required(t("REQUIRED_ERR")),
    clientSecret: yup.string().when("clientType", {
      is: "private",
      then: yup.string().required(t("REQUIRED_ERR")),
    }),
    socialAuthentication: yup.string().when("clientType", {
      is: "public",
      then: yup.string().required(t("REQUIRED_ERR")),
    }),
    redirectUris: yup
      .array()
      .min(0)
      .of(yup.string().required(t("REDIRECT_URIS_ERR"))),
  });

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={clientDetails}
        validationSchema={validationAccountSchema}
        onSubmit={submitClientHandler}
      >
        {({ errors, touched, values, setFieldValue }) => (
          <Form>
            <PageContentWrapper
              title={clientUuid ? t("OAUTH2_TITLE") : t("CREATE_OAUTH2_TITLE")}
              sections={[
                {
                  id: "0",
                  title: t("CLIENT_ID"),
                  content: (
                    <Field
                      id="clientId"
                      name="clientId"
                      as={Input}
                      fullWidth
                      error={
                        errors.clientId && touched.clientId
                          ? errors.clientId
                          : ""
                      }
                      loading={getClientById.isLoading}
                    />
                  ),
                },
                {
                  id: "1",
                  title: t("CLIENT_TYPE"),
                  content: (
                    <Field
                      id="clientType"
                      name="clientType"
                      as={Radio}
                      type="HORIZONTAL"
                      value={values.clientType}
                      options={clientTypeOptions}
                      error={
                        errors.clientType && touched.clientType
                          ? errors.clientType
                          : ""
                      }
                      onChange={({}, value) => {
                        setFieldValue("clientType", value);
                      }}
                      loading={getClientById.isLoading}
                    />
                  ),
                },
                {
                  id: "0",
                  title: t("CLIENT_SECRET"),
                  isHidden: values.clientType !== "private",
                  content: (
                    <InputWithButtonField>
                      <Field
                        id="clientSecret"
                        name="clientSecret"
                        as={Input}
                        fullWidth
                        type={viewSecret ? "text" : "password"}
                        error={
                          errors.clientSecret && touched.clientSecret
                            ? errors.clientSecret
                            : ""
                        }
                        loading={getClientById.isLoading}
                        disabled={!addMode}
                      />
                      <InputButton
                        buttonType="nobackground"
                        onClick={() => {
                          setViewSecret(!viewSecret);
                        }}
                        compact
                        icon={
                          viewSecret ? (
                            <EyeInvisibleOutlined />
                          ) : (
                            <EyeOutlined />
                          )
                        }
                      />
                    </InputWithButtonField>
                  ),
                },
                {
                  id: "0",
                  title: t("SOCIAL_AUTH"),
                  isHidden: values.clientType !== "public",
                  content: (
                    <Select
                      onOptionChange={(value) =>
                        setFieldValue("socialAuthentication", value)
                      }
                      selectedKey={values.socialAuthentication}
                      options={socialSelectList}
                      fullWidth
                      addClearButton
                      onOptionClear={() =>
                        setFieldValue("socialAuthentication", "")
                      }
                      error={
                        errors.socialAuthentication &&
                        touched.socialAuthentication
                          ? String(errors.socialAuthentication)
                          : ""
                      }
                    />
                  ),
                },
                {
                  id: "2",
                  title: t("REDIRECT_URIS"),
                  isHidden: values.clientType !== "public",
                  content: (
                    <div>
                      {values.redirectUris?.map((uri, index) => (
                        <InputWithButtonField key={`uri${index}`}>
                          <Input
                            id="redirectUri"
                            name="clientId"
                            value={uri}
                            fullWidth
                            onChange={(e) => {
                              let newUris = [].concat(values.redirectUris);
                              newUris[index] = e.target.value;
                              setFieldValue("redirectUris", newUris);
                            }}
                            loading={getClientById.isLoading}
                            error={
                              index === values.redirectUris.length - 1 &&
                              errors.redirectUris &&
                              touched.redirectUris
                                ? errors.redirectUris
                                : ""
                            }
                          />
                          <InputButton
                            buttonType="nobackground"
                            icon={<CloseOutlined />}
                            compact
                            onClick={() => {
                              let newUris = [].concat(values.redirectUris);
                              newUris.splice(index, 1);
                              setFieldValue("redirectUris", newUris);
                            }}
                          />
                        </InputWithButtonField>
                      ))}
                      <ButtonDivSpaceAbove>
                        <Link
                          onClick={() => {
                            if (
                              values.redirectUris[
                                values.redirectUris.length - 1
                              ] !== ""
                            ) {
                              let newUris = [].concat(values.redirectUris);
                              newUris.push("");
                              setFieldValue("redirectUris", newUris);
                            }
                          }}
                        >
                          <PlusOutlined /> {t("ADD_URIS")}
                        </Link>
                      </ButtonDivSpaceAbove>
                    </div>
                  ),
                },
                {
                  id: "4",
                  title: t("PROJECTS"),
                  content: (
                    <div>
                      <Transfer
                        left={availableProjectList}
                        right={selectedProjectList}
                        fullWidth
                        leftLabel={t("PROJECT_LEFT_LABEL")}
                        rightLabel={t("PROJECT_RIGHT_LABEL")}
                        error={
                          errors.projects && touched.projects
                            ? errors.projects
                            : ""
                        }
                        onChange={(source, target) => {
                          setAvailableProjectList(source);
                          setSelectedProjectList(target);
                          setFieldValue("projects", target);
                        }}
                        loading={
                          getClientById.isLoading || getProjectList.isLoading
                        }
                      />
                    </div>
                  ),
                },
                {
                  // PERMISSIONS ***
                  id: "4",
                  title: t("PERMISSIONS"),
                  content: (
                    <div>
                      <Transfer
                        left={availablePermissionList}
                        right={values.permissions || []}
                        fullWidth
                        leftLabel={t("PERMISSION_LEFT_LABEL")}
                        rightLabel={t("PERMISSION_RIGHT_LABEL")}
                        error={
                          errors.permissions && touched.permissions
                            ? errors.permissions
                            : ""
                        }
                        onChange={(source, target) => {
                          setAvailablePermissionList(source);
                          setFieldValue("permissions", target);
                        }}
                        loading={
                          getClientById.isLoading || getPermissions.isLoading
                        }
                      />
                    </div>
                  ),
                },
                {
                  id: "5",
                  content: (
                    <ButtonDiv>
                      <Button
                        type="submit"
                        loading={
                          patchClientById.isLoading || postClient.isLoading
                        }
                      >
                        {addMode ? t("CREATE") : t("UPDATE")}
                      </Button>
                    </ButtonDiv>
                  ),
                },
              ]}
            />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ClientForm;
