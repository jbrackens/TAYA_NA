import { PlusOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import { Col, Tooltip } from "antd";
import { FieldArray, FormikProps, FormikProvider, useFormik } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import {
  Button,
  ErrorComponent,
  Input,
  Select,
  TextArea,
  message,
  Result,
} from "ui";
import {
  EventGetResponseType,
  EventPostResponseType,
  ValueType,
  ValueTypeEnum,
} from "utils";
import * as yup from "yup";
import { useApi } from "../../../../services/api-service";
import { DeleteModal } from "../../../delete-modal";
import { PageContentWrapper } from "../../../page-content-wrapper";
import {
  AddNewFieldContainer,
  ButtonContainer,
  CloseButton,
  EventsFieldContainer,
  ButtonRightDiv,
} from "../../../page-content-wrapper/index.styled";
import {
  CreatorTitle,
  RuleConfigContent,
  LeftPanel,
  RightPanel,
  RuleConfigContainer,
} from "../../shared-compoents/styled-components/index.styled";
import { ToggleContainerComponent } from "../../shared-compoents/toggle-container";
import EventsListComponent from "../list";
import { ListSiderHeaderSection } from "./../../shared-compoents/headerSection";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

interface EventFormTypes {
  name: string;
  description: string;
  fields: {
    name: string;
    valueType: ValueType;
  }[];
  isActive?: boolean;
}

export const EventsContainer = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentProjectId = useSelector(getProjectId);

  const getEvents: {
    data: EventGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`rule_configurator/admin/${currentProjectId}/events`, "GET");
  const postEvent: {
    data: EventPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`rule_configurator/admin/${currentProjectId}/events`, "POST");
  const [listElements, setListElements] = useState<Array<any>>([]);
  const [errorCodes, setErrorCodes] = useState<Array<string>>([]);
  const [showErrorSection, setShowErrorSection] = useState<Boolean>(false);
  const eventId = router.query.id;

  const getEventById: {
    data: EventPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/events/${eventId}`,
    "GET",
  );
  const patchEvent: {
    data: EventPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/events/${eventId}`,
    "PATCH",
  );
  const deleteEvent: {
    triggerApi: any;
    error: any;
    statusOk?: boolean;
    isLoading?: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/events/${eventId}`,
    "DELETE",
  );
  const rightPanelRef = useRef<any>(null);
  const isAddMode = router.pathname.includes("add") || !!eventId;

  useEffect(() => {
    fetchAll();
    if (eventId) {
      form.resetForm();
      fetchById();
    }
  }, [currentProjectId]);

  useEffect(() => {
    form.resetForm();
    if (eventId) {
      fetchById();
    }
  }, [eventId]);

  useEffect(() => {
    setShowErrorSection(!navigator.onLine);
  }, [navigator.onLine]);

  useEffect(() => {
    if (getEventById.data) {
      form.resetForm();
      if (eventId !== getEventById.data?.details?.eventId) {
        fetchById();
        return;
      }
      form.setValues({
        name: getEventById.data.details.name,
        description: getEventById.data.details.description,
        fields: getEventById.data.details.fields,
        isActive: getEventById.data.details.isActive,
      });
    }
  }, [getEventById.data]);

  useEffect(() => {
    if (getEvents.data) {
      setListElements(
        getEvents.data.details.map((eventData) => {
          return {
            title: eventData.name,
            id: eventData.eventId,
            status: eventData.isActive,
          };
        }),
      );
    }
  }, [getEvents.data]);

  useEffect(() => {
    if (postEvent.data) {
      message.success(t("POST_EVENT_SUCCESS"));
      setListElements((prev) => [
        ...prev,
        {
          title: postEvent.data.details.name,
          id: postEvent.data.details.eventId,
          status: true,
        },
      ]);
      form.resetForm();
      router.push(
        `/rule-configuration/events/${postEvent.data.details.eventId}`,
        undefined,
        { shallow: true },
      );
      window.scrollTo(0, 0);
    }
  }, [postEvent.data]);

  useEffect(() => {
    if (patchEvent.data) {
      form.setValues({
        name: patchEvent.data.details.name,
        description: patchEvent.data.details.description,
        fields: patchEvent.data.details.fields,
        isActive: patchEvent.data.details.isActive,
      });

      setListElements((prev) => [
        ...prev.map((listEl) => {
          if (listEl.id === patchEvent.data.details.eventId) {
            return {
              ...listEl,
              status: patchEvent.data.details.isActive,
            };
          }
          return listEl;
        }),
      ]);
      message.success(t("PATCH_EVENT_SUCCESS"));
    }
  }, [patchEvent.data]);

  useEffect(() => {
    if (deleteEvent.statusOk) {
      closeDeleteModal();
      router.push("/rule-configuration/events/add", undefined, {
        shallow: true,
      });
    }
  }, [deleteEvent.statusOk]);

  const windwoResized = () => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  };

  useEffect(() => {
    window.addEventListener("resize", windwoResized, true);
    fetchAll();
    return () => {
      window.removeEventListener("resize", windwoResized, true);
    };
  }, []);

  useEffect(() => {
    if (getEvents.error) {
      setErrorCodes(getEvents.error.payload.details.errorCodes);
      message.error(t(getEvents.error.payload.details.errorCodes[0]));
      getEvents.resetHookState();
    }

    if (postEvent.error) {
      setErrorCodes(postEvent.error.payload.details.errorCodes);
      message.error(t(postEvent.error.payload.details.errorCodes[0]));
      postEvent.resetHookState();
    }

    if (getEventById.error) {
      // TODO need to handle it better way
      setErrorCodes([t("EVENT_NOT_FOUND")]);
      message.error(t("EVENT_NOT_FOUND"));
      getEventById.resetHookState();
    }

    if (patchEvent.error) {
      message.error(t(patchEvent.error.payload.details.errorCodes[0]));
      patchEvent.resetHookState();
    }
  }, [getEvents.error, postEvent.error, getEventById.error, patchEvent.error]);

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .required(t("FORM_ERROR_REQUIRED", { field: t("Name") }))
      .max(50, t("FORM_ERROR_MAX_LENGTH", { field: t("Name"), length: "50" }))
      .matches(
        /^[a-zA-Z0-9-.]{0,50}$/,
        t("FORM_ERROR_FORMAT", { field: t("Name"), format: "a-z0-9.-" }),
      ),
    description: yup.string().max(250, t("DESC_LENGTH_ERROR")),
    fields: yup
      .array()
      .of(
        yup.object().shape({
          name: yup
            .string()
            .required(t("FIELD_ERROR"))
            .matches(/^[a-zA-Z0-9-_.]{0,50}$/, t("NAME_FORMAT_ERROR")),
        }),
      )
      .min(1, t("NO_FIELDS_ERROR")),
  });

  const form: FormikProps<EventFormTypes> = useFormik({
    initialValues: {
      name: "",
      description: "",
      fields: [
        {
          name: "",
          valueType: ValueTypeEnum.BOOLEAN,
        },
      ],
      isActive: false,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      if (eventId) {
        patchEvent.triggerApi({
          description: values.description,
          isActive: values.isActive,
        });
        return;
      }
      postEvent.triggerApi({
        name: values.name,
        description: values.description,
        ...(values.fields.length && { fields: values.fields }),
      });
    },
  });

  const fieldCreator = (
    <FormikProvider value={form}>
      <FieldArray name="fields">
        {({ remove, push }) => (
          <>
            {form.values.fields.map((_eventField, idx) => (
              <EventsFieldContainer key={idx} gutter={12}>
                <Col span={!!eventId ? 14 : 12}>
                  <Input
                    placeholder={t("NAME")}
                    value={form.values.fields[idx].name}
                    name={`fields.${idx}.name`}
                    onChange={form.handleChange}
                    error={
                      form.touched.fields?.[idx]?.name &&
                      typeof form.errors.fields !== "string" &&
                      (form.errors.fields?.[idx] as any)?.name
                    }
                    disabled={!!eventId}
                    fullWidth
                    loading={getEventById.isLoading}
                  />
                </Col>
                <Col span={10}>
                  <Select
                    name={`fields.${idx}.valueType`}
                    value={form.values.fields[idx].valueType}
                    onOptionChange={(value) =>
                      form.setFieldValue(`fields.${idx}.valueType`, value)
                    }
                    disabled={!!eventId}
                    options={[
                      {
                        key: t("BOOLEAN"),
                        value: ValueTypeEnum.BOOLEAN,
                      },
                      {
                        key: t("FLOAT"),
                        value: ValueTypeEnum.FLOAT,
                      },
                      {
                        key: t("INTEGER"),
                        value: ValueTypeEnum.INTEGER,
                      },
                      {
                        key: t("STRING"),
                        value: ValueTypeEnum.STRING,
                      },
                    ]}
                    fullWidth
                    loading={getEventById.isLoading}
                  />
                </Col>

                {!eventId && (
                  <Col span={2}>
                    <CloseButton
                      buttonType="nobackground"
                      onClick={() => remove(idx)}
                    >
                      <CloseOutlined />
                    </CloseButton>
                  </Col>
                )}
              </EventsFieldContainer>
            ))}
            {!eventId && (
              <>
                <AddNewFieldContainer
                  onClick={() =>
                    push({ name: "", valueType: ValueTypeEnum.BOOLEAN })
                  }
                >
                  <PlusOutlined /> <span> {t("ADD_NEW_FIELD")}</span>
                </AddNewFieldContainer>
                {form.touched.fields &&
                  typeof form.errors.fields === "string" && (
                    <ErrorComponent errors={[form.errors.fields]} t={t} />
                  )}
              </>
            )}
          </>
        )}
      </FieldArray>
    </FormikProvider>
  );

  const isDeleteButtonDisabled = patchEvent.data
    ? patchEvent.data.details.isActive
    : getEventById.data
    ? getEventById.data.details.isActive
    : true;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletModalError, setDeletModalError] = useState("");

  useEffect(() => {
    setDeletModalError(
      deleteEvent.error
        ? deleteEvent.error?.payload?.details?.errorCodes[0]
        : "",
    );
  }, [deleteEvent.error?.payload?.details?.errorCodes[0]]);

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setDeletModalError("");
  };

  const [leftPanelheight, setLeftpanelHeight] = useState(
    rightPanelRef?.current?.clientHeight,
  );
  useEffect(() => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  }, [rightPanelRef?.current?.clientHeight, isAddMode]);

  const redirectToTestEvent = () => {
    form.resetForm();
    router.push(`/rule-configuration/events/${eventId}/test`, undefined, {
      shallow: true,
    });
    window.scrollTo(0, 0);
  };

  const fetchById = () => {
    getEventById.resetHookState();
    currentProjectId && getEventById.triggerApi();
  };

  const fetchAll = () => {
    currentProjectId &&
      getEvents.triggerApi(undefined, {
        query: {
          include_inactive: true,
        },
      });
  };

  return (
    <RuleConfigContainer>
      <ListSiderHeaderSection headerText={t("EVENT_CONFIGURATION")} />
      <RuleConfigContent>
        <LeftPanel $height={leftPanelheight}>
          <EventsListComponent
            list={listElements}
            loading={getEvents.isLoading}
          />
        </LeftPanel>
        <RightPanel ref={rightPanelRef}>
          {showErrorSection && (
            <Result
              title="Something went wrong"
              subTitle="Please try again"
              button="Retry"
              onButtonClicked={() => {
                fetchAll();
                fetchById();
              }}
            />
          )}
          {!showErrorSection && isAddMode && currentProjectId && (
            <PageContentWrapper
              title={eventId ? t("EVENTS") : t("EVENT_CONFIGURATION")}
              sections={[
                {
                  id: "0",
                  content: eventId ? (
                    <ToggleContainerComponent
                      isActive={form.values.isActive}
                      onChangeFunc={form.setFieldValue}
                    />
                  ) : (
                    <CreatorTitle>{t("CREATE_EVENT")}</CreatorTitle>
                  ),
                },
                {
                  id: "1",
                  title: t("EVENT_ID"),
                  content: (
                    <Input
                      value={(eventId as string) || ""}
                      disabled
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  ),
                  isHidden: !!!eventId,
                },
                {
                  id: "2",
                  title: t("NAME"),
                  content: (
                    <Input
                      name="name"
                      value={form.values.name}
                      onChange={form.handleChange}
                      error={form.touched.name && form.errors.name}
                      disabled={!!eventId}
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  ),
                },
                {
                  id: "3",
                  title: t("DESCRIPTION"),
                  content: (
                    <TextArea
                      name="description"
                      value={form.values.description}
                      onChange={form.handleChange}
                      error={
                        form.touched.description && form.errors.description
                      }
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  ),
                },
                {
                  id: "4",
                  title: t("FIELDS"),
                  content: fieldCreator,
                },
                ...(errorCodes.length
                  ? [
                      {
                        id: "6",
                        content: <ErrorComponent errors={errorCodes} t={t} />,
                      },
                    ]
                  : []),
                {
                  id: "5",
                  content: (
                    <ButtonContainer editMode={!!eventId}>
                      {eventId && (
                        <>
                          {!isDeleteButtonDisabled ? (
                            <Button
                              buttonType="danger"
                              disabled={isDeleteButtonDisabled}
                              onClick={() => setIsDeleteModalVisible(true)}
                            >
                              <DeleteOutlined />
                              {t("DELETE")}
                            </Button>
                          ) : (
                            <Tooltip
                              placement="top"
                              title={t("EVENT_MUST_BE_INACTIVE")}
                              trigger={"hover"}
                            >
                              <span>
                                <Button
                                  buttonType="danger"
                                  disabled={isDeleteButtonDisabled}
                                  onClick={() => setIsDeleteModalVisible(true)}
                                >
                                  <DeleteOutlined />
                                  {t("DELETE")}
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                        </>
                      )}
                      <ButtonRightDiv>
                        {eventId && (
                          <Button
                            buttonType="blue-outline"
                            onClick={redirectToTestEvent}
                          >
                            {t("TEST_EVENT")}
                          </Button>
                        )}
                        <Button
                          buttonType="primary"
                          onClick={form.submitForm}
                          loading={postEvent.isLoading || patchEvent.isLoading}
                        >
                          {t("SAVE")}
                        </Button>
                      </ButtonRightDiv>
                    </ButtonContainer>
                  ),
                },
              ]}
            />
          )}
        </RightPanel>
        <DeleteModal
          isVisbile={isDeleteModalVisible}
          onCloseButtonClick={closeDeleteModal}
          onOutsideClick={closeDeleteModal}
          onCancelClick={closeDeleteModal}
          onConfirmClick={deleteEvent.triggerApi}
          loading={deleteEvent.isLoading}
          error={deletModalError}
        />
      </RuleConfigContent>
    </RuleConfigContainer>
  );
};
