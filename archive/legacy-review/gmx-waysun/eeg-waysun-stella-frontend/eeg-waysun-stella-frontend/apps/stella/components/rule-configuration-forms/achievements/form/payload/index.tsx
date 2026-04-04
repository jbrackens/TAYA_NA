import { Col, Row } from "antd";
import { FormikProps } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { FC, useEffect, useState } from "react";
import { Input, Select } from "ui";
import {
  EventGetResponseType,
  OperationEnum,
  ReplaceFromValueEnum,
} from "utils";
import { useApi } from "../../../../../services/api-service";
import { TableContainer } from "../../../../table-container";
import { AchievementFormTypes } from "../../container";
import { PayloadContainer, LabelCol } from "./index.styled";
import { getProjectId } from "./../../../../../lib/slices/appDataSlice";
import { useSelector } from "react-redux";

type AggType = {
  key: string;
  name: string;
};

type PayloadComponentProps = {
  form: FormikProps<AchievementFormTypes>;
  loading?: boolean;
  aggregations?: Array<AggType>;
};

export const PayloadComponent: FC<PayloadComponentProps> = ({
  form,
  loading = false,
  aggregations,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const achievementId = router.query.id;
  const currentProjectId = useSelector(getProjectId);
  const getEvents: {
    data: EventGetResponseType;
    triggerApi: any;
    error: any;
    resetHookState: any;
  } = useApi(`rule_configurator/admin/${currentProjectId}/events`, "GET");
  const [options, setOptions] = useState<Array<{ key: string; value: string }>>(
    [],
  );

  const selectedEvent = form.values.eventId;

  const replaceFromValueOptions = [
    {
      key: ReplaceFromValueEnum.SUM,
      value: t("SUM"),
    },
    {
      key: ReplaceFromValueEnum.MIN,
      value: t("MIN"),
    },
    {
      key: ReplaceFromValueEnum.MAX,
      value: t("MAX"),
    },
    {
      key: ReplaceFromValueEnum.COUNT,
      value: t("COUNT"),
    },
    {
      key: ReplaceFromValueEnum.CUSTOM,
      value: t("CUSTOM"),
    },
    {
      key: ReplaceFromValueEnum.GROUP_BY_FIELD_VALUE,
      value: t("GROUP_BY_FIELD_VALUE"),
    },
  ];

  useEffect(() => {
    getEvents.triggerApi(undefined, {
      query: {
        include_inactive: true,
      },
    });
  }, []);

  useEffect(() => {
    if (getEvents.data) {
      setOptions(
        getEvents.data.details.map((eventData) => ({
          key: eventData.eventId,
          value: eventData.name,
        })),
      );
    }
  }, [getEvents.data]);

  useEffect(() => {
    if (selectedEvent && getEvents.data) {
      const selectedEventFields = getEvents.data.details.find(
        (el) => el.eventId === selectedEvent,
      )?.fields;
      form.setFieldValue(
        "setFields",
        selectedEventFields.map((field) => ({
          fieldName: field.name,
          operation: "",
        })),
      );
    }
  }, [selectedEvent]);

  const aggregationOptions = Array.from(
    new Map(
      form.values?.conditions.map((item) => [item["aggregationRuleId"], item]),
    ).values(),
  )
    .map((condition) => {
      if (condition.aggregationRuleId) {
        return {
          key: condition.aggregationRuleId,
          value:
            aggregations.length > 0
              ? aggregations.find(
                  (aggItem) => aggItem.key === condition.aggregationRuleId,
                ).name
              : condition.aggregationRuleId,
        };
      }
    })
    .filter((el) => el);

  useEffect(() => {
    const filteredSetFieldsValue = form.values.setFields.map((field) => {
      if (
        form.values.conditions.some(
          (el) => el.aggregationRuleId === field.aggregationRuleId,
        )
      ) {
        return field;
      }
      const { aggregationRuleId, ...rest } = field;
      return {
        ...rest,
      };
    });
    form.setFieldValue("setFields", filteredSetFieldsValue);
  }, [form.values.conditions]);

  const getAggregationName = (idx: number) => {
    return aggregations.find(
      (aggDetails) =>
        aggDetails.key === form.values.setFields?.[idx].aggregationRuleId,
    )?.name;
  };

  return (
    <PayloadContainer>
      <TableContainer
        title={t("PAYLOAD")}
        body={
          <>
            <Select
              name={"eventId"}
              value={selectedEvent}
              selectedKey={selectedEvent}
              labelText={t("EVENT_CONFIGURATION_ID")}
              onOptionChange={(value) => {
                form.setFieldValue("eventId", value);
              }}
              onInputChange={(e) => !!!e && form.setFieldValue("setFields", [])}
              disabled={!!achievementId}
              options={options}
              error={form.touched.eventId && form.errors.eventId}
              search
              fullWidth
              loading={loading}
              addClearButton
              onOptionClear={() => form.setFieldValue("eventId", "")}
            />
          </>
        }
      />
      {form.values.setFields.map((_field, idx) => (
        <TableContainer
          key={idx}
          body={
            <>
              <Row align="middle">
                <LabelCol span={8}>{t("FIELD_NAME")}</LabelCol>
                <Col span={16}>
                  <Input
                    name={`setFields${idx}.fieldName`}
                    value={form.values.setFields[idx].fieldName}
                    onChange={form.handleChange}
                    fullWidth
                    disabled
                    loading={loading}
                  />
                </Col>
              </Row>
              <Row align="middle">
                <LabelCol span={8}>{t("ACTION")}</LabelCol>
                <Col span={16}>
                  <Select
                    name={`setFields${idx}.operation`}
                    selectedKey={form.values.setFields[idx].operation}
                    onOptionChange={(value) =>
                      form.setFieldValue(`setFields.${idx}`, {
                        operation: value,
                        fieldName: form.values.setFields[idx].fieldName,
                        ...(form.values.setFields?.[idx]?.value && {
                          value: form.values.setFields[idx].value,
                        }),
                      })
                    }
                    error={
                      form.touched.setFields?.[idx]?.operation &&
                      typeof form.errors.setFields !== "string" &&
                      (form.errors.setFields?.[idx] as any)?.operation
                    }
                    disabled={!!achievementId}
                    options={[
                      {
                        key: OperationEnum.REPLACE_FROM,
                        value: t("REPLACE_FROM"),
                      },
                      {
                        key: OperationEnum.STATIC,
                        value: t("STATIC"),
                      },
                    ]}
                    loading={loading}
                  />
                </Col>
              </Row>
              {form.values.setFields[idx].operation ===
                OperationEnum.STATIC && (
                <Row align="middle">
                  <LabelCol span={8}>{t("VALUE")}</LabelCol>
                  <Col span={16}>
                    <Input
                      name={`setFields.${idx}.value`}
                      value={form.values.setFields[idx].value}
                      onChange={form.handleChange}
                      fullWidth
                      disabled={!!achievementId}
                      error={
                        form.submitCount &&
                        typeof form.errors.setFields !== "string" &&
                        (form.errors.setFields?.[idx] as any)?.value
                      }
                      loading={loading}
                    />
                  </Col>
                </Row>
              )}
              {form.values.setFields[idx].operation ===
                OperationEnum.REPLACE_FROM && (
                <>
                  <Row align="middle">
                    <LabelCol span={8}>{t("AGGREGATION")}</LabelCol>
                    <Col span={16}>
                      <Select
                        name={`setFields.${idx}.aggregationRuleId`}
                        value={getAggregationName(idx)}
                        error={
                          form.submitCount &&
                          typeof form.errors.setFields !== "string" &&
                          (form.errors.setFields?.[idx] as any)
                            ?.aggregationRuleId
                        }
                        onOptionChange={(value) =>
                          form.setFieldValue(
                            `setFields.${idx}.aggregationRuleId`,
                            value,
                          )
                        }
                        disabled={!!achievementId}
                        options={aggregationOptions}
                        fullWidth
                        loading={loading}
                      />
                    </Col>
                  </Row>
                  <Row align="middle">
                    <LabelCol span={8}>{t("VALUE")}</LabelCol>
                    <Col span={16}>
                      <Select
                        name={`setFields.${idx}.value`}
                        value={form.values.setFields[idx].value}
                        selectedKey={form.values.setFields[idx].value}
                        onOptionChange={(value) =>
                          form.setFieldValue(`setFields.${idx}.value`, value)
                        }
                        fullWidth
                        disabled={!!achievementId}
                        options={replaceFromValueOptions}
                        error={
                          form.submitCount &&
                          typeof form.errors.setFields !== "string" &&
                          (form.errors.setFields?.[idx] as any)?.value
                        }
                        loading={loading}
                      />
                    </Col>
                  </Row>
                </>
              )}
            </>
          }
        />
      ))}
    </PayloadContainer>
  );
};
