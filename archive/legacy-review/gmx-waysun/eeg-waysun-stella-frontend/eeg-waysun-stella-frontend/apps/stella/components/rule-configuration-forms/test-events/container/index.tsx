// import { PlusOutlined, CloseOutlined, DeleteOutlined } from "@ant-design/icons";
import { Col } from "antd";
import { FieldArray, FormikProps, FormikProvider, useFormik } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import { Button, ErrorComponent, Input, Select, Link, message } from "ui";
import {
  EventGetResponseType,
  EventPostResponseType,
  ValueType,
  ValueTypeEnum,
  SendEventType,
} from "utils";
import * as Yup from "yup";
import { useApi } from "../../../../services/api-service";
import { PageContentWrapper } from "../../../page-content-wrapper";
import {
  ButtonContainer,
  EventsFieldContainer,
  ButtonRightDiv,
} from "../../../page-content-wrapper/index.styled";
import {
  RuleConfigContent,
  LeftPanel,
  RightPanel,
  RuleConfigContainer,
} from "../../shared-compoents/styled-components/index.styled";
import EventsListComponent from "../list";
import JsonComponent from "../json";
import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { ListSiderHeaderSection } from "./../../shared-compoents/headerSection";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

interface EventFormTypes {
  name: string;
  fields: {
    name: string;
    valueType: ValueType;
    value?: string;
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
  const sendEvent: {
    triggerApi: any;
    error: any;
    statusOk?: boolean;
    isLoading: boolean;
    resetHookState: any;
  } = useApi("event_ingestor/event", "POST");
  const [listElements, setListElements] = useState<Array<any>>([]);
  const [errorCodes, setErrorCodes] = useState<Array<string>>([]);
  const [showError, setShowError] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [displayJsonContent, setDisplayJsonContent] = useState(false);
  const [jsonData, setJsonData] = useState<SendEventType | null>(null);
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
  const isAddMode = router.pathname.includes("add") || !!eventId;
  useEffect(() => {
    fetchAll();
    fetchById();
  }, [currentProjectId]);
  useEffect(() => {
    if (eventId) {
      fetchById();
    } else if (isAddMode) {
      form.resetForm();
    }
  }, [eventId]);
  const rightPanelRef = useRef<any>(null);
  useEffect(() => {
    if (getEventById.data) {
      form.resetForm();
      form.setValues({
        name: getEventById.data.details.name,
        fields: getEventById.data.details.fields,
        isActive: getEventById.data.details.isActive,
      });
    }
  }, [getEventById.data]);

  useEffect(() => {
    if (sendEvent.statusOk) {
      message.success(t("SEND_MESSAGE"));
      setShowJson(true);
      setShowError(false);
      setErrorCodes([]);
    }
  }, [sendEvent.statusOk]);

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
    !showJson && setDisplayJsonContent(false);
  }, [showJson]);

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
      getEvents.resetHookState();
    }

    if (getEventById.error) {
      // TODO need to handle it better way
      setErrorCodes([t("EVENT_NOT_FOUND")]);
      getEventById.resetHookState();
    }

    if (sendEvent.error) {
      message.error(t("SEND_EVENT_FAILED"));
      sendEvent.resetHookState();
    }
  }, [getEvents.error, getEventById.error, sendEvent.error]);

  const validationSchema = Yup.object().shape({
    fields: Yup.array().of(
      Yup.object().shape({
        value: Yup.string().required(t("FIELD_VALIDATION")),
      }),
    ),
  });

  const validateValues = (values) => {
    let errors = { ...form.errors },
      errorFound = false;
    errors.fields = values.fields.map((fieldDetails) => {
      if (fieldDetails.value) {
        switch (fieldDetails.valueType) {
          case ValueTypeEnum.INTEGER.toLowerCase():
            if (
              Number(fieldDetails.value) === fieldDetails.value &&
              fieldDetails.value % 1 !== 0
            ) {
              errorFound = true;
              return { value: t("INTEGER_VALIDATION") };
            } else {
              return {};
            }
          default:
            return {};
        }
      }
    });
    return errorFound ? errors : {};
  };

  const sendEventSubmit = (values) => {
    const payloadData = values.fields.map((fieldDetails) => {
      let value = fieldDetails.value;
      if (typeof value !== "string") {
        value = JSON.stringify(fieldDetails.value);
      }
      return {
        name: fieldDetails.name,
        value: value,
      };
    });
    const dateNow = new Date();
    let payload = {
      messageOriginDateUTC: dateNow.toISOString(),
      eventName: getEventById.data.details.name,
      payload: payloadData,
    };
    sendEvent.triggerApi(payload);
    setJsonData(payload);
  };

  const form: FormikProps<EventFormTypes> = useFormik({
    initialValues: {
      name: "",
      fields: [],
    },
    validationSchema: validationSchema,
    validate: validateValues,
    onSubmit: sendEventSubmit,
  });

  const [leftPanelheight, setLeftpanelHeight] = useState(
    rightPanelRef?.current?.clientHeight,
  );

  useEffect(() => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  }, [rightPanelRef?.current?.clientHeight, isAddMode, displayJsonContent]);

  const fieldCreator = (
    <FormikProvider value={form}>
      <FieldArray name="fields">
        {({ remove, push }) => (
          <>
            {form.values.fields.map((_eventField, idx) => {
              const ticketErrors: any =
                (form.errors.fields?.length && form.errors.fields[idx]) || {};
              return (
                <EventsFieldContainer key={idx} gutter={12}>
                  <Col span={10}>
                    <Select
                      value={form.values.fields[idx].name}
                      name={`fields.${idx}.name`}
                      disabled
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  </Col>
                  <Col span={7}>
                    <Select
                      name={`fields.${idx}.valueType`}
                      value={form.values.fields[idx].valueType}
                      disabled
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  </Col>
                  <Col span={7}>
                    {form.values.fields[idx].valueType ===
                    ValueTypeEnum.BOOLEAN.toLowerCase() ? (
                      <Select
                        options={["True", "False"]}
                        fullWidth
                        loading={getEventById.isLoading}
                        name={`fields.${idx}.value`}
                        selectedKey={
                          form.values.fields[idx].value === "true"
                            ? 0
                            : form.values.fields[idx].value === "false"
                            ? 1
                            : -1
                        }
                        onOptionChange={(value) => {
                          setShowJson(false);
                          form.setFieldValue(
                            `fields.${idx}.value`,
                            value ? "false" : "true",
                          );
                        }}
                        error={showError && ticketErrors?.value}
                      />
                    ) : (
                      <Input
                        fullWidth
                        loading={getEventById.isLoading}
                        name={`fields.${idx}.value`}
                        onChange={form.handleChange}
                        onBlur={() => setShowJson(false)}
                        value={form.values.fields?.[idx]?.value}
                        error={showError && ticketErrors?.value}
                        type={
                          form.values.fields[idx].valueType ===
                          ValueTypeEnum.STRING.toLowerCase()
                            ? "text"
                            : "number"
                        }
                      />
                    )}
                  </Col>
                </EventsFieldContainer>
              );
            })}
          </>
        )}
      </FieldArray>
    </FormikProvider>
  );

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
          {isAddMode && currentProjectId && (
            <PageContentWrapper
              title={t("TEST_EVENTS_HEADER")}
              sections={[
                {
                  id: "0",
                  title: t("TEST_EVENTS_NAME"),
                  content: (
                    <Select
                      name="name"
                      value={form.values.name}
                      disabled
                      fullWidth
                      loading={getEventById.isLoading}
                    />
                  ),
                },
                {
                  id: "1",
                  title: t("FIELDS"),
                  content: fieldCreator,
                },
                ...(errorCodes.length
                  ? [
                      {
                        id: "3",
                        content: <ErrorComponent errors={errorCodes} t={t} />,
                      },
                    ]
                  : []),
                {
                  id: "4",
                  content: (
                    <>
                      <ButtonContainer>
                        <Button
                          buttonType="white-outline"
                          onClick={() => {
                            router.push(
                              `/rule-configuration/events/${eventId}`,
                            );
                          }}
                        >
                          {t("BACK")}
                        </Button>
                        <ButtonRightDiv>
                          {showJson && (
                            <Link
                              onClick={() =>
                                setDisplayJsonContent(!displayJsonContent)
                              }
                            >
                              {t("JSON_LINK")}{" "}
                              {displayJsonContent ? (
                                <CaretUpOutlined />
                              ) : (
                                <CaretDownOutlined />
                              )}
                            </Link>
                          )}
                          <Button
                            buttonType="primary"
                            type="submit"
                            onClick={(e) => {
                              form.submitForm();
                              setShowError(true);
                              setShowJson(false);
                              setErrorCodes([]);
                            }}
                            loading={sendEvent.isLoading}
                          >
                            {t("SEND")}
                          </Button>
                        </ButtonRightDiv>
                      </ButtonContainer>
                      <JsonComponent
                        display={displayJsonContent}
                        variableToDisplay={jsonData}
                      />
                    </>
                  ),
                },
              ]}
            />
          )}
        </RightPanel>
      </RuleConfigContent>
    </RuleConfigContainer>
  );
};
