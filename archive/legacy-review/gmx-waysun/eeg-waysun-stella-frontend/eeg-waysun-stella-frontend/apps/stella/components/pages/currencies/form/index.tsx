import React, { FC, useEffect, useState } from "react";
import { Formik, Field, Form } from "formik";
import { Input, message, Transfer, Button } from "ui";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { ButtonDiv } from "./../index.style";
import { useRouter } from "next/router";
import * as yup from "yup";

type CurrencyFormProps = {
  addMode: boolean;
  currencyId: string | string[] | undefined;
};
const CurrencyForm: FC<CurrencyFormProps> = ({
  addMode = false,
  currencyId = undefined,
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  //   ------> useState variables <-------
  const [availableProjectList, setAvailableProjectList] = useState([]);
  const [selectedProjectList, setSelectedProjectList] = useState([]);
  const [currencyDetails, setCurrencyDetails] = useState({
    currencyId: currencyId,
    symbol: "",
    name: "",
    verboseName: "",
    associatedProjects: [],
  });

  //   ------> API's <-------
  const getCurrencyById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`wallet/admin/currencies/${currencyId}`, "GET");

  const getProjectList: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/projects", "GET");

  const patchCurrencyById: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`wallet/admin/currencies/${currencyId}`, "PATCH");

  const postCurrency: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("wallet/admin/currencies", "POST");

  //   ------> useEffects <-------
  useEffect(() => {
    currencyId && getCurrencyById.triggerApi();
  }, [currencyId]);

  useEffect(() => {
    addMode && getProjectList.triggerApi();
  }, [addMode]);

  useEffect(() => {
    if (!patchCurrencyById.data) return;
    if (patchCurrencyById.data.status !== "ok") return;

    message.success(t("PATCH_SUCCESS"));
  }, [patchCurrencyById.data]);

  useEffect(() => {
    if (!postCurrency.data) return;
    if (postCurrency.data.status !== "ok") return;

    message.success(t("POST_SUCCESS"));
    router.push(
      `/wallet/currencies/${postCurrency.data.details.id}`,
      undefined,
      { shallow: true },
    );
  }, [postCurrency.data]);

  useEffect(() => {
    if (!getCurrencyById.data) return;
    if (getCurrencyById.data.status !== "ok") return;

    getProjectList.triggerApi();
    const currency = getCurrencyById.data.details;
    setCurrencyDetails({
      currencyId: currencyId,
      symbol: currency.symbol,
      name: currency.name,
      verboseName: currency.verboseName,
      associatedProjects: currency.associatedProjects,
    });
  }, [getCurrencyById.data]);

  useEffect(() => {
    if (!getProjectList.data) return;
    if (getProjectList.data.status !== "ok") return;

    const projectList = getProjectList.data.details;
    let selectedProjects = [],
      availableProjects = projectList.map((project) => ({
        value: project.name,
        key: project.projectId,
        checked: false,
      }));
    if (currencyDetails.associatedProjects.length > 0) {
      currencyDetails.associatedProjects.forEach((projectId) => {
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
        (listItem) =>
          !currencyDetails.associatedProjects.includes(listItem.key),
      ),
    );
    setSelectedProjectList(selectedProjects);
  }, [getProjectList.data]);

  useEffect(() => {
    if (getCurrencyById.error) {
      return message.error(
        t(getCurrencyById.error?.payload?.details?.errorCodes[0]),
      );
    }
    if (getProjectList.error) {
      return message.error(
        t(getProjectList.error?.payload?.details?.errorCodes[0]),
      );
    }
    if (patchCurrencyById.error) {
      return message.error(
        t(patchCurrencyById.error?.payload?.details?.errorCodes[0]),
      );
    }
    if (postCurrency.error) {
      return message.error(
        t(postCurrency.error?.payload?.details?.errorCodes[0]),
      );
    }
  }, [
    getProjectList.error,
    getCurrencyById.error,
    patchCurrencyById.error,
    postCurrency.error,
  ]);

  //   ------> Handler functions <-------
  const submitCurrencyHandler = (values) => {
    const payload = {
      name: values.name,
      verboseName: values.verboseName,
      symbol: values.symbol,
      associatedProjects: values.associatedProjects.map((project) =>
        typeof project === "string" ? project : project.key,
      ),
    };
    if (currencyId) return patchCurrencyById.triggerApi(payload);
    if (addMode) return postCurrency.triggerApi(payload);
  };

  //   ------> Form schema <-------
  const validationAccountSchema = yup.object().shape({
    symbol: yup.string().required(t("REQUIRED_ERR")),
    name: yup.string().required(t("REQUIRED_ERR")),
    verboseName: yup.string().required(t("REQUIRED_ERR")),
    associatedProjects: yup
      .array()
      .min(1, t("SELECT_PROJECT_ERR"))
      .required("REQUIRED_ERR"),
  });

  return (
    <>
      <Formik
        enableReinitialize
        initialValues={currencyDetails}
        validationSchema={validationAccountSchema}
        onSubmit={submitCurrencyHandler}
      >
        {({ errors, touched, setFieldValue }) => (
          <Form>
            <PageContentWrapper
              title={
                currencyId ? t("CURRENCY_TITLE") : t("CREATE_CURRENCY_TITLE")
              }
              sections={[
                {
                  id: "0",
                  title: t("CURRENCY_ID"),
                  isHidden: addMode,
                  content: (
                    <Field
                      id="currencyId"
                      name="currencyId"
                      as={Input}
                      fullWidth
                      error={
                        errors.currencyId && touched.currencyId
                          ? errors.currencyId
                          : ""
                      }
                      disabled
                      loading={getCurrencyById.isLoading}
                    />
                  ),
                },
                {
                  id: "1",
                  title: t("SYMBOL"),
                  content: (
                    <Field
                      id="symbol"
                      name="symbol"
                      as={Input}
                      fullWidth
                      error={
                        errors.symbol && touched.symbol ? errors.symbol : ""
                      }
                      loading={getCurrencyById.isLoading}
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
                      loading={getCurrencyById.isLoading}
                    />
                  ),
                },
                {
                  id: "3",
                  title: t("VERBOSE_NAME"),
                  content: (
                    <Field
                      id="verboseName"
                      name="verboseName"
                      as={Input}
                      fullWidth
                      error={
                        errors.verboseName && touched.verboseName
                          ? errors.verboseName
                          : ""
                      }
                      loading={getCurrencyById.isLoading}
                    />
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
                          errors.associatedProjects &&
                          touched.associatedProjects
                            ? errors.associatedProjects
                            : ""
                        }
                        onChange={(source, target) => {
                          setAvailableProjectList(source);
                          setSelectedProjectList(target);
                          setFieldValue("associatedProjects", target);
                        }}
                        loading={
                          getCurrencyById.isLoading || getProjectList.isLoading
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
                          patchCurrencyById.isLoading || postCurrency.isLoading
                        }
                      >
                        {addMode ? t("CREATE_CURRENCY") : t("UPDATE_CURRENCY")}
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

export default CurrencyForm;
