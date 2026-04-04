import { FormikProps, useFormik } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import {
  AggregationGetResponseType,
  AggregationPostResponseType,
  AggregationType,
  AggregationTypeEnum,
  ConditionTypeEnum,
  IntervalEnum,
  IntervalType,
} from "utils";
import * as yup from "yup";
import { useApi } from "../../../../services/api-service";
import { DeleteModal } from "../../../delete-modal";
import { AggregationFormComponent } from "../form";
import { AggregationsListComponent } from "../list";
import {
  RuleConfigContent,
  LeftPanel,
  RightPanel,
  RuleConfigContainer,
} from "../../shared-compoents/styled-components/index.styled";
import { message, Result } from "ui";
import { ListSiderHeaderSection } from "./../../shared-compoents/headerSection";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

export interface AggregationFormTypes {
  name: string;
  description: string;
  eventConfigurationId: string;
  resetFrequency: {
    interval: IntervalType;
    windowStartDateUTC?: {
      time: string;
      date: string;
    };
    intervalDetails: {
      length: number;
      windowCountLimit?: number;
    };
  };
  aggregationType: AggregationType;
  aggregationFieldName: string;
  aggregationGroupByFieldName?: string;
  aggregationConditions: {
    eventFieldName: string;
    conditionType: ConditionTypeEnum;
    value: string;
  }[];
  isActive: boolean;
}

export const AggregationsContainer = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentProjectId = useSelector(getProjectId);

  const getAggregations: {
    data: AggregationGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`rule_configurator/admin/${currentProjectId}/aggregations`, "GET");
  const postAggregation: {
    data: AggregationPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/aggregations`,
    "POST",
  );
  const [listElements, setListElements] = useState<Array<any>>([]);
  const [errorCodes, setErrorCodes] = useState<Array<string>>([]);
  const [showErrorSection, setShowErrorSection] = useState<Boolean>(false);
  const aggregationId = router.query.id;
  const getAggregationById: {
    data: AggregationPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/aggregations/${aggregationId}`,
    "GET",
  );
  const patchAggregation: {
    data: AggregationPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/aggregations/${aggregationId}`,
    "PATCH",
  );
  const deleteAggregation: {
    triggerApi: any;
    error: any;
    statusOk?: boolean;
    isLoading?: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/aggregations/${aggregationId}`,
    "DELETE",
  );

  const windwoResized = () => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  };

  useEffect(() => {
    fetchAll();
    if (aggregationId) {
      form.resetForm();
      fetchById();
    }
  }, [currentProjectId]);

  useEffect(() => {
    window.addEventListener("resize", windwoResized, true);
    fetchAll();
    setErrorCodes([]);
    return () => {
      window.removeEventListener("resize", windwoResized, true);
    };
  }, []);
  const rightPanelRef = useRef<any>(null);
  const isAddMode = router.pathname.includes("add") || !!aggregationId;

  useEffect(() => {
    form.resetForm();
    if (aggregationId) {
      fetchById();
    }
  }, [aggregationId]);

  useEffect(() => {
    setShowErrorSection(!navigator.onLine);
  }, [navigator.onLine]);

  useEffect(() => {
    if (getAggregationById.data) {
      form.resetForm();
      if (aggregationId !== getAggregationById.data.details.aggregationRuleId) {
        fetchById();
        return;
      }
      form.setValues({
        name: getAggregationById.data.details.name,
        description: getAggregationById.data.details.description,
        eventConfigurationId:
          getAggregationById.data.details.eventConfigurationId,
        resetFrequency: {
          interval: getAggregationById.data.details.resetFrequency.interval,
          // just for now, it will be displayed other way when timezone applied
          windowStartDateUTC: {
            time: getAggregationById.data.details.resetFrequency.windowStartDateUTC
              .split("T")?.[1]
              .replace("Z", ""),
            date: getAggregationById.data.details.resetFrequency.windowStartDateUTC.split(
              "T",
            )?.[0],
          },
          intervalDetails: {
            length:
              getAggregationById.data.details.resetFrequency.intervalDetails
                ?.length || 0,
            windowCountLimit:
              getAggregationById.data.details.resetFrequency.intervalDetails
                ?.windowCountLimit,
          },
        },
        aggregationType: getAggregationById.data.details.aggregationType,
        aggregationConditions:
          getAggregationById.data.details.aggregationConditions,
        aggregationFieldName:
          getAggregationById.data.details.aggregationFieldName,
        aggregationGroupByFieldName:
          getAggregationById.data.details.aggregationGroupByFieldName,
        isActive: getAggregationById.data.details.isActive,
      });
    }
  }, [getAggregationById.data]);

  useEffect(() => {
    if (getAggregations.data) {
      setListElements(
        getAggregations.data.details.map((aggregationData) => {
          return {
            title: aggregationData.name,
            id: aggregationData.aggregationRuleId,
            status: aggregationData.isActive,
          };
        }),
      );
    }
  }, [getAggregations.data]);

  useEffect(() => {
    if (postAggregation.data) {
      message.success(t("POST_AGGREGATION_SUCCESS"));
      setListElements((prev) => [
        ...prev,
        {
          title: postAggregation.data.details.name,
          id: postAggregation.data.details.eventConfigurationId,
          status: true,
        },
      ]);
      form.resetForm();
      setErrorCodes([]);
      router.push(
        `/rule-configuration/aggregations/${postAggregation.data.details.aggregationRuleId}`,
        undefined,
        { shallow: true },
      );
      window.scrollTo(0, 0);
    }
  }, [postAggregation.data]);

  useEffect(() => {
    if (patchAggregation.data) {
      form.setFieldValue("isActive", patchAggregation.data.details.isActive);

      setListElements((prev) => [
        ...prev.map((listEl) => {
          if (listEl.id === patchAggregation.data.details.aggregationRuleId) {
            return {
              ...listEl,
              status: patchAggregation.data.details.isActive,
            };
          }
          return listEl;
        }),
      ]);
      message.success(t("PATCH_AGGREGATION_SUCCESS"));
    }
  }, [patchAggregation.data]);

  useEffect(() => {
    if (deleteAggregation.statusOk) {
      closeDeleteModal();
      router.push("/rule-configuration/aggregations/add", undefined, {
        shallow: true,
      });
    }
  }, [deleteAggregation.statusOk]);

  useEffect(() => {
    if (getAggregations.error) {
      setErrorCodes(getAggregations.error.payload.details.errorCodes);
      message.error(t(getAggregations.error.payload.details.errorCodes[0]));
      getAggregations.resetHookState();
    }

    if (postAggregation.error) {
      setErrorCodes(postAggregation.error.payload.details.errorCodes);
      message.error(t(postAggregation.error.payload.details.errorCodes[0]));
      postAggregation.resetHookState();
    }

    if (getAggregationById.error) {
      // TODO need to handle it better way
      setErrorCodes([t("AGGREGATION_NOT_FOUND")]);
      message.error(t("AGGREGATION_NOT_FOUND"));
      getAggregationById.resetHookState();
    }

    if (patchAggregation.error) {
      message.error(t(patchAggregation.error.payload.details.errorCodes[0]));
      patchAggregation.resetHookState();
    }
  }, [
    getAggregations.error,
    postAggregation.error,
    getAggregationById.error,
    patchAggregation.error,
  ]);

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .required(t("FORM_ERROR_REQUIRED", { field: t("Name") }))
      .max(50, t("FORM_ERROR_MAX_LENGTH", { field: t("Name"), length: "50" }))
      .min(1, t("FORM_ERROR_REQUIRED", { field: t("Name") })),
    description: yup
      .string()
      .required(t("DESC_ERROR"))
      .max(250, t("DESC_lENGTH_ERROR")),
    eventConfigurationId: yup.string().required(t("EVENT_CONF_ID_ERROR")),
    aggregationFieldName: yup.string().required(t("AGGREGATION_OVER_ERROR")),
    aggregationConditions: yup.array().of(
      yup.object().shape({
        value: yup.string().when("conditionType", {
          is: (type) => type !== ConditionTypeEnum.NN,
          then: yup
            .string()
            .required(t("CONDITION_VALUE_ERROR"))
            .max(250, t("CONDITION_VALUE_LENGTH_ERROR")),
        }),
        eventFieldName: yup.string().required(t("EVENT_FIELD_ERROR")),
        conditionType: yup.string().required(t("EVENT_CONDITION_ERROR")),
      }),
    ),
    resetFrequency: yup.object().shape({
      interval: yup.string(),
      windowStartDateUTC: yup.object().shape({
        date: yup
          .string()
          .test("date", t("WINDOW_START_DATE_ERROR"), (value) => {
            if (!value) {
              return (
                !!value === !!form.values.resetFrequency.windowStartDateUTC.time
              );
            }
            return true;
          }),
        time: yup
          .string()
          .test("time", t("WINDOW_START_DATE_ERROR"), (value) => {
            if (!value) {
              return (
                !!value === !!form.values.resetFrequency.windowStartDateUTC.date
              );
            }
            return true;
          }),
      }),
      intervalDetails: yup.object().shape({
        length: yup
          .number()
          .test(
            "length",
            t("LENGTH_ERROR"),
            (value) =>
              form.values.resetFrequency.interval === IntervalEnum.NEVER ||
              (value && value > 0),
          )
          .test("length", t("INTERVAL_LENGTH_ERROR"), (value) =>
            form.values.resetFrequency.interval === IntervalEnum.MINUTES
              ? value < 26280000
              : true,
          )
          .test("length", t("INTERVAL_LENGTH_ERROR"), (value) =>
            form.values.resetFrequency.interval === IntervalEnum.HOURS
              ? value < 438000
              : true,
          )
          .test("length", t("INTERVAL_LENGTH_ERROR"), (value) =>
            form.values.resetFrequency.interval === IntervalEnum.DAYS
              ? value < 18250
              : true,
          )
          .test("length", t("INTERVAL_LENGTH_ERROR"), (value) =>
            form.values.resetFrequency.interval === IntervalEnum.MONTHS
              ? value < 599
              : true,
          ),
      }),
    }),
  });

  const form: FormikProps<AggregationFormTypes> = useFormik({
    initialValues: {
      name: "",
      description: "",
      eventConfigurationId: "",
      resetFrequency: {
        interval: IntervalEnum.MINUTES,
        windowStartDateUTC: {
          time: "",
          date: "",
        },
        intervalDetails: {
          length: 0,
          windowCountLimit: 0,
        },
      },
      aggregationType: AggregationTypeEnum.MIN,
      aggregationFieldName: "",
      aggregationGroupByFieldName: "",
      aggregationConditions: [
        {
          eventFieldName: "",
          conditionType: ConditionTypeEnum.EQ,
          value: "",
        },
      ],
      isActive: false,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      if (aggregationId) {
        patchAggregation.triggerApi({
          isActive: values.isActive,
          description: values.description,
        });
        return;
      }
      postAggregation.triggerApi({
        name: values.name,
        description: values.description,
        eventConfigurationId: values.eventConfigurationId,
        resetFrequency: {
          interval: values.resetFrequency.interval,
          ...(values.resetFrequency.windowStartDateUTC.date &&
            values.resetFrequency.windowStartDateUTC.time && {
              windowStartDateUTC: new Date(
                `${values.resetFrequency.windowStartDateUTC.date} ${values.resetFrequency.windowStartDateUTC.time}`,
              ).toISOString(),
            }),
          ...(form.values.resetFrequency.interval !== IntervalEnum.NEVER && {
            intervalDetails: {
              length: values.resetFrequency.intervalDetails.length,
              ...(values.resetFrequency.intervalDetails.windowCountLimit && {
                windowCountLimit:
                  values.resetFrequency.intervalDetails.windowCountLimit,
              }),
            },
          }),
        },
        aggregationType: values.aggregationType,
        aggregationFieldName: values.aggregationFieldName,
        aggregationGroupByFieldName: values.aggregationGroupByFieldName,
        aggregationConditions: values.aggregationConditions.map(
          (condition) => ({
            eventFieldName: condition.eventFieldName,
            conditionType: condition.conditionType,
            ...(condition.value && { value: condition.value }),
          }),
        ),
      });
    },
  });

  const isDeleteButtonDisabled = patchAggregation.data
    ? patchAggregation.data.details.isActive
    : getAggregationById.data
    ? getAggregationById.data.details.isActive
    : true;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletModalError, setDeletModalError] = useState("");

  useEffect(() => {
    setDeletModalError(
      deleteAggregation.error
        ? deleteAggregation.error?.payload?.details?.errorCodes[0]
        : "",
    );
  }, [deleteAggregation.error?.payload?.details?.errorCodes[0]]);

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

  const fetchById = () => {
    getAggregationById.resetHookState();
    currentProjectId && getAggregationById.triggerApi();
  };

  const fetchAll = () => {
    currentProjectId &&
      getAggregations.triggerApi(undefined, {
        query: {
          include_inactive: true,
        },
      });
  };

  return (
    <RuleConfigContainer>
      <ListSiderHeaderSection headerText={t("AGGREGATION_CONFIGURATION")} />
      <RuleConfigContent>
        <LeftPanel $height={leftPanelheight}>
          <AggregationsListComponent
            list={listElements}
            loading={getAggregations.isLoading}
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
            <AggregationFormComponent
              form={form}
              isDeleteButtonDisabled={isDeleteButtonDisabled}
              errorCodes={errorCodes}
              setIsDeleteModalVisible={setIsDeleteModalVisible}
              buttonLoading={
                patchAggregation.isLoading || postAggregation.isLoading
              }
              formLoading={getAggregationById.isLoading}
            />
          )}
        </RightPanel>
        <DeleteModal
          isVisbile={isDeleteModalVisible}
          onCloseButtonClick={closeDeleteModal}
          onOutsideClick={closeDeleteModal}
          onCancelClick={closeDeleteModal}
          onConfirmClick={deleteAggregation.triggerApi}
          loading={deleteAggregation.isLoading}
          error={deletModalError}
        />
      </RuleConfigContent>
    </RuleConfigContainer>
  );
};
