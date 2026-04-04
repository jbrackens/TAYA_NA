import React, { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { FormikProps } from "formik";
import { AchievementFormTypes } from "../container";
import {
  Button,
  ErrorComponent,
  Input,
  Radio,
  RadioTypeEnum,
  TextArea,
} from "ui";
import { AchievementsConditionCreatorComponent } from "./condition-creator";
import { ActionTypeEnum, RequestEnum } from "utils";
import { PayloadComponent } from "./payload";
import { ButtonContainer } from "../../../page-content-wrapper/index.styled";
import { DeleteOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { CreatorTitle } from "../../shared-compoents/styled-components/index.styled";
import { ToggleContainerComponent } from "../../shared-compoents/toggle-container";
import { useTranslation } from "next-export-i18n";
import { AggregationGetResponseType } from "utils";
import { useApi } from "../../../../services/api-service";
import { getProjectId } from "./../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type AchievementFormComponentProps = {
  form: FormikProps<AchievementFormTypes>;
  isDeleteButtonDisabled: boolean;
  errorCodes: Array<string>;
  setIsDeleteModalVisible: (arg: boolean) => void;
  buttonLoading: boolean;
  formLoading?: boolean;
};

export const AchievementFormComponent: FC<AchievementFormComponentProps> = ({
  form,
  isDeleteButtonDisabled,
  errorCodes,
  setIsDeleteModalVisible,
  buttonLoading,
  formLoading = false,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const achievementId = router.query.id;
  const currentProjectId = useSelector(getProjectId);

  const getAggregations: {
    data: AggregationGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
  } = useApi(`rule_configurator/admin/${currentProjectId}/aggregations`, "GET");

  const [aggregations, setAggregations] = useState([]);

  useEffect(() => {
    getAggregations.triggerApi(undefined, {
      query: {
        include_inactive: true,
      },
    });
  }, []);

  useEffect(() => {
    if (getAggregations.data) {
      setAggregations(
        getAggregations.data.details.map((aggregation) => ({
          key: aggregation.aggregationRuleId,
          name: aggregation.name,
        })),
      );
    }
  }, [getAggregations.data]);

  return (
    <PageContentWrapper
      title={t("ACHIEVEMENT_CONFIGURATION")}
      sections={[
        {
          id: "0",
          content: achievementId ? (
            <ToggleContainerComponent
              isActive={form.values.isActive}
              onChangeFunc={form.setFieldValue}
            />
          ) : (
            <CreatorTitle>{t("CREATE_ACHIEVEMENT_CONFIGURATION")}</CreatorTitle>
          ),
        },
        {
          id: "1",
          title: t("ACHIEVEMENT_RULE_ID"),
          content: (
            <Input
              value={(achievementId as string) || ""}
              disabled
              fullWidth
              loading={formLoading}
            />
          ),
          isHidden: !!!achievementId,
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
              fullWidth
              disabled={!!achievementId}
              loading={formLoading}
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
              error={form.touched.description && form.errors.description}
              fullWidth
              loading={formLoading}
            />
          ),
        },
        {
          id: "4",
          content: (
            <AchievementsConditionCreatorComponent
              form={form}
              loading={formLoading}
              aggregations={aggregations}
            />
          ),
        },
        {
          id: "5",
          title: t("ACTION_TYPE"),
          content: (
            <Radio
              name="actionType"
              options={[
                {
                  value: ActionTypeEnum.EVENT,
                  name: t("EVENT"),
                },
                {
                  value: ActionTypeEnum.WEBHOOK,
                  name: t("WEBHOOK"),
                },
              ]}
              type={RadioTypeEnum.HORIZONTAL}
              onChange={(_name, value) =>
                form.setFieldValue("actionType", value)
              }
              value={form.values.actionType}
              disabled={!!achievementId}
              loading={formLoading}
            />
          ),
        },
        ...(form.values.actionType === ActionTypeEnum.EVENT
          ? [
              {
                id: "6",
                content: (
                  <PayloadComponent
                    form={form}
                    loading={formLoading}
                    aggregations={aggregations}
                  />
                ),
              },
            ]
          : [
              {
                id: "6",
                title: t("WEBHOOK_DETAILS"),
                titleHighlighted: true,
                content: (
                  <Radio
                    type={RadioTypeEnum.HORIZONTAL}
                    name="requestType"
                    onChange={(value) =>
                      form.setFieldValue("requestType", value)
                    }
                    value={form.values.requestType}
                    options={[
                      {
                        value: RequestEnum.DELETE,
                        name: t(RequestEnum.DELETE),
                      },
                      {
                        value: RequestEnum.GET,
                        name: t(RequestEnum.GET),
                      },
                      {
                        value: RequestEnum.PATCH,
                        name: t(RequestEnum.PATCH),
                      },
                      {
                        value: RequestEnum.POST,
                        name: t(RequestEnum.POST),
                      },
                      {
                        value: RequestEnum.PUT,
                        name: t(RequestEnum.PUT),
                      },
                    ]}
                    loading={formLoading}
                  />
                ),
              },
              {
                id: "7",
                title: t("TARGET_URL"),
                content: (
                  <Input
                    name={"targetUrl"}
                    value={form.values.targetUrl}
                    onChange={form.handleChange}
                    error={form.touched.targetUrl && form.errors.targetUrl}
                    fullWidth
                    loading={formLoading}
                  />
                ),
              },
              {
                id: "8",
                content: (
                  <PayloadComponent
                    form={form}
                    loading={formLoading}
                    aggregations={aggregations}
                  />
                ),
              },
            ]),
        ...(errorCodes.length
          ? [
              {
                id: "9",
                content: <ErrorComponent errors={errorCodes} t={t} />,
              },
            ]
          : []),
        {
          id: "10",
          content: (
            <ButtonContainer editMode={!!achievementId}>
              {achievementId && (
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
                      title={t("ACHIEVEMENT_MUST_BE_INACTIVE")}
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
              <Button
                buttonType="primary"
                onClick={form.submitForm}
                loading={buttonLoading}
              >
                {t("SAVE")}
              </Button>
            </ButtonContainer>
          ),
        },
      ]}
    />
  );
};
