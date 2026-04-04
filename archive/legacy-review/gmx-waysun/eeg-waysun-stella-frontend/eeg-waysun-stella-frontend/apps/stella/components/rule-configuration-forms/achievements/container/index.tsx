import { FormikProps, useFormik } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef } from "react";
import {
  AchievementGetResponseType,
  AchievementPostResponseType,
  ActionType,
  ActionTypeEnum,
  AggregationTypeEnum,
  ConditionObjectType,
  ConditionTypeEnum,
  OperationEnum,
  RequestEnum,
  RequestType,
  SetFieldType,
} from "utils";
import * as yup from "yup";
import { useApi } from "../../../../services/api-service";
import { DeleteModal } from "../../../delete-modal";
import { AchievementFormComponent } from "../form";
import { AchievementsListComponent } from "../list";
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

export interface AchievementFormTypes {
  name: string;
  conditions: Array<ConditionObjectType>;
  eventId: string;
  setFields: Array<SetFieldType>;
  actionType: ActionType;
  targetUrl: string;
  requestType: RequestType;
  isActive: boolean;
  description: string;
}

export const AchievementsContainer = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const currentProjectId = useSelector(getProjectId);

  const achievementId = router.query.id;
  const getAchievements: {
    data: AchievementGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`rule_configurator/admin/${currentProjectId}/achievements`, "GET");
  const getAchievementById: {
    data: AchievementPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/achievements/${achievementId}`,
    "GET",
  );
  const [listElements, setListElements] = useState<Array<any>>([]);
  const [errorCodes, setErrorCodes] = useState<Array<string>>([]);
  const [showErrorSection, setShowErrorSection] = useState<Boolean>(false);
  const patchAchievement: {
    data: AchievementPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/achievements/${achievementId}`,
    "PATCH",
  );
  const deleteAchievement: {
    triggerApi: any;
    error: any;
    statusOk?: boolean;
    isLoading?: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/achievements/${achievementId}`,
    "DELETE",
  );
  const postAchievement: {
    data: AchievementPostResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(
    `rule_configurator/admin/${currentProjectId}/achievements`,
    "POST",
  );

  const windwoResized = () => {
    rightPanelRef?.current?.clientHeight &&
      setLeftpanelHeight(rightPanelRef?.current?.clientHeight);
  };

  useEffect(() => {
    fetchAll();
    if (achievementId) {
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
  const isAddMode = router.pathname.includes("add") || !!achievementId;

  useEffect(() => {
    if (getAchievements.data) {
      setListElements(
        getAchievements.data.details.map((achievementData) => {
          return {
            title: achievementData.achievementName,
            id: achievementData.achievementRuleId,
            status: achievementData.isActive,
          };
        }),
      );
    }
  }, [getAchievements.data]);

  useEffect(() => {
    form.resetForm();
    if (achievementId) {
      fetchById();
    }
  }, [achievementId]);

  useEffect(() => {
    setShowErrorSection(!navigator.onLine);
  }, [navigator.onLine]);

  useEffect(() => {
    if (getAchievementById.data) {
      const data = getAchievementById.data.details;
      if (achievementId !== data.achievementRuleId) {
        fetchById();
        return;
      }
      form.resetForm();
      form.setValues({
        name: data.achievementName,
        conditions: data.conditions,
        description: data.description,
        eventId:
          data.action.actionType === ActionTypeEnum.EVENT
            ? data.action.payload.eventId
            : data.action.payload.eventConfig.eventId,
        setFields:
          data.action.actionType === ActionTypeEnum.EVENT
            ? data.action.payload.setFields
            : data.action.payload.eventConfig.setFields,
        actionType: data.action.actionType,
        targetUrl:
          data.action.actionType === ActionTypeEnum.WEBHOOK
            ? data.action.payload.targetUrl
            : "",
        requestType:
          data.action.actionType === ActionTypeEnum.WEBHOOK
            ? data.action.payload.requestType
            : RequestEnum.DELETE,
        isActive: data.isActive,
      });
    }
  }, [getAchievementById.data]);

  useEffect(() => {
    if (patchAchievement.data) {
      form.setFieldValue("isActive", patchAchievement.data.details.isActive);

      setListElements((prev) => [
        ...prev.map((listEl) => {
          if (listEl.id === patchAchievement.data.details.achievementRuleId) {
            return {
              ...listEl,
              status: patchAchievement.data.details.isActive,
            };
          }
          return listEl;
        }),
      ]);
      message.success(t("PATCH_ACHIEVEMENT_SUCCESS"));
    }
  }, [patchAchievement.data]);

  useEffect(() => {
    if (postAchievement.data) {
      message.success(t("POST_ACHIEVEMENT_SUCCESS"));
      setListElements((prev) => [
        ...prev,
        {
          title: postAchievement.data.details.achievementName,
          id: postAchievement.data.details.achievementRuleId,
          status: true,
        },
      ]);
      form.resetForm();
      router.push(
        `/rule-configuration/achievements/${postAchievement.data.details.achievementRuleId}`,
        undefined,
        { shallow: true },
      );
      window.scrollTo(0, 0);
    }
  }, [postAchievement.data]);

  useEffect(() => {
    if (deleteAchievement.statusOk) {
      closeDeleteModal();
      router.push("/rule-configuration/achievements/add", undefined, {
        shallow: true,
      });
    }
  }, [deleteAchievement.statusOk]);

  useEffect(() => {
    if (getAchievements.error) {
      setErrorCodes(getAchievements.error.payload.details.errorCodes);
      message.error(t(getAchievements.error.payload.details.errorCodes[0]));
      getAchievements.resetHookState();
    }

    if (postAchievement.error) {
      setErrorCodes(postAchievement.error.payload.details.errorCodes);
      message.error(t(postAchievement.error.payload.details.errorCodes[0]));
      postAchievement.resetHookState();
    }

    if (getAchievementById.error) {
      // TODO need to handle it better way
      setErrorCodes([t("ACHIEVEMENT_NOT_FOUND")]);
      message.error(t("ACHIEVEMENT_NOT_FOUND"));
      getAchievementById.resetHookState();
    }

    if (patchAchievement.error) {
      message.error(t(patchAchievement.error.payload.details.errorCodes[0]));
      patchAchievement.resetHookState();
    }
  }, [
    getAchievements.error,
    postAchievement.error,
    getAchievementById.error,
    patchAchievement.error,
  ]);

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .required(t("FORM_ERROR_REQUIRED", { field: t("Name") }))
      .max(250, t("FORM_ERROR_MAX_LENGTH", { field: t("Name"), length: "250" }))
      .min(1, t("FORM_ERROR_REQUIRED", { field: t("Name") })),
    eventId: yup
      .string()
      .required(t("FORM_ERROR_REQUIRED", { field: t("Event ID") })),
    conditions: yup
      .array()
      .of(
        yup.object().shape({
          aggregationRuleId: yup
            .string()
            .required(
              t("FORM_ERROR_REQUIRED", { field: t("Aggregation Rule ID") }),
            ),
          value: yup.string().when("conditionType", {
            is: (type) => type !== ConditionTypeEnum.NN,
            then: yup
              .string()
              .required(t("FORM_ERROR_REQUIRED", { field: t("Value") })),
          }),
        }),
      )
      .min(1, t("FORM_ERROR_REQUIRED", { field: t("Conditions") })),
    setFields: yup.array().of(
      yup.object().shape({
        operation: yup
          .string()
          .required(t("FORM_ERROR_REQUIRED", { field: t("Operation") })),
        aggregationRuleId: yup.string().when("operation", {
          is: (operation) => operation === OperationEnum.REPLACE_FROM,
          then: yup
            .string()
            .required(
              t("FORM_ERROR_REQUIRED", { field: t("Aggregation rule ID") }),
            ),
        }),
        value: yup
          .string()
          .required(t("FORM_ERROR_REQUIRED", { field: t("Value") })),
      }),
    ),
    targetUrl: yup.string().when("actionType", {
      is: (type) => type === ActionTypeEnum.WEBHOOK,
      then: yup
        .string()
        .required(t("FORM_ERROR_REQUIRED", { field: t("Target URL") }))
        .url(t("TARGET_URL_ERROR")),
    }),
  });

  const form: FormikProps<AchievementFormTypes> = useFormik({
    initialValues: {
      name: "",
      isActive: false,
      description: "",
      conditions: [
        {
          aggregationRuleId: "",
          aggregationField: AggregationTypeEnum.COUNT,
          conditionType: ConditionTypeEnum.EQ,
          value: "",
        },
      ],
      actionType: ActionTypeEnum.EVENT,
      requestType: RequestEnum.DELETE,
      eventId: "",
      setFields: [],
      targetUrl: "",
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      if (achievementId) {
        patchAchievement.triggerApi({
          isActive: values.isActive,
          description: values.description,
        });
        return;
      }
      const requestBody = {
        achievementName: values.name,
        description: values.description,
        action: {
          actionType: values.actionType,
          payload: {
            ...(values.actionType === ActionTypeEnum.EVENT && {
              eventId: values.eventId,
              setFields: values.setFields,
            }),
            ...(values.actionType === ActionTypeEnum.WEBHOOK && {
              requestType: values.requestType,
              targetUrl: values.targetUrl,
              eventConfig: {
                eventId: values.eventId,
                setFields: values.setFields,
              },
            }),
          },
        },
        conditions: values.conditions.map((condition) => ({
          aggregationField: condition.aggregationField,
          aggregationRuleId: condition.aggregationRuleId,
          conditionType: condition.conditionType,
          ...(condition.value && {
            value: condition.value,
          }),
        })),
      };
      postAchievement.triggerApi(requestBody);
    },
  });

  const isDeleteButtonDisabled = patchAchievement.data
    ? patchAchievement.data.details.isActive
    : getAchievementById.data
    ? getAchievementById.data.details.isActive
    : true;

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletModalError, setDeletModalError] = useState("");

  useEffect(() => {
    setDeletModalError(
      deleteAchievement.error
        ? deleteAchievement.error?.payload?.details?.errorCodes[0]
        : "",
    );
  }, [deleteAchievement.error?.payload?.details?.errorCodes[0]]);

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
    getAchievementById.resetHookState();
    currentProjectId && getAchievementById.triggerApi();
  };

  const fetchAll = () => {
    currentProjectId &&
      getAchievements.triggerApi(undefined, {
        query: {
          include_inactive: true,
        },
      });
  };

  return (
    <RuleConfigContainer>
      <ListSiderHeaderSection headerText={t("ACHIEVEMENT_CONFIGURATION")} />
      <RuleConfigContent>
        <LeftPanel $height={leftPanelheight}>
          <AchievementsListComponent
            list={listElements}
            loading={getAchievements.isLoading}
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
            <AchievementFormComponent
              form={form}
              isDeleteButtonDisabled={isDeleteButtonDisabled}
              errorCodes={errorCodes}
              setIsDeleteModalVisible={setIsDeleteModalVisible}
              buttonLoading={
                patchAchievement.isLoading || postAchievement.isLoading
              }
              formLoading={getAchievementById.isLoading}
            />
          )}
        </RightPanel>
        <DeleteModal
          isVisbile={isDeleteModalVisible}
          onCloseButtonClick={closeDeleteModal}
          onOutsideClick={closeDeleteModal}
          onCancelClick={closeDeleteModal}
          onConfirmClick={deleteAchievement.triggerApi}
          loading={deleteAchievement.isLoading}
          error={deletModalError}
        />
      </RuleConfigContent>
    </RuleConfigContainer>
  );
};
