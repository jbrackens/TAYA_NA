import { DeleteOutlined } from "@ant-design/icons";
import { Col, Row, Tooltip } from "antd";
import { FormikProps } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { FC, useState } from "react";
import {
  Button,
  Calender,
  Checkbox,
  ErrorComponent,
  Input,
  Radio,
  RadioTypeEnum,
  Select,
  TextArea,
  TimePicker,
} from "ui";
import {
  AggregationTypeEnum,
  ConditionTypeEnum,
  EventType,
  FieldType,
  IntervalEnum,
} from "utils";
import { PageContentWrapper } from "../../../page-content-wrapper";
import { ButtonContainer } from "../../../page-content-wrapper/index.styled";
import { CreatorTitle } from "../../shared-compoents/styled-components/index.styled";
import { ToggleContainerComponent } from "../../shared-compoents/toggle-container";
import { AggregationEventSelect } from "../aggregation-event-select";
import { AggregationFormTypes } from "../container";
import { AggregationConditionCreatorComponent } from "./condition-creator";

type AggregationFormComponentProps = {
  form: FormikProps<AggregationFormTypes>;
  isDeleteButtonDisabled: boolean;
  errorCodes: Array<string>;
  setIsDeleteModalVisible: (arg: boolean) => void;
  buttonLoading: boolean;
  formLoading: boolean;
};

export const AggregationFormComponent: FC<AggregationFormComponentProps> = ({
  form,
  isDeleteButtonDisabled,
  errorCodes,
  setIsDeleteModalVisible,
  buttonLoading,
  formLoading,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const aggregationId = router.query.id;
  const [eventFields, setEventFields] = useState<Array<FieldType>>([]);

  const frequencyOptions = [
    {
      value: IntervalEnum.MINUTES,
      name: t("MINUTES"),
    },
    {
      value: IntervalEnum.HOURS,
      name: t("HOURS"),
    },
    {
      value: IntervalEnum.DAYS,
      name: t("DAYS"),
    },
    {
      value: IntervalEnum.MONTHS,
      name: t("MONTHS"),
    },
    {
      value: IntervalEnum.NEVER,
      name: t("NEVER"),
    },
  ];

  const aggregationTypeOptions = [
    {
      value: AggregationTypeEnum.MIN,
      name: t("MINIMUM"),
    },
    {
      value: AggregationTypeEnum.MAX,
      name: t("MAX"),
    },
    {
      value: AggregationTypeEnum.SUM,
      name: t("SUM"),
    },
    {
      value: AggregationTypeEnum.COUNT,
      name: t("COUNT"),
    },
  ];

  const aggregationEventSelectOnChange = (id: string, event: EventType) => {
    form.setFieldValue("aggregationConditions", [
      {
        eventFieldName: "",
        conditionType: ConditionTypeEnum.EQ,
        value: "",
      },
    ]);
    form.setFieldValue("aggregationFieldName", "");
    form.setFieldValue("aggregationGroupByFieldName", "");
    if (event) {
      setEventFields(event.fields);
    }
    form.setFieldValue(`eventConfigurationId`, id);
  };

  const windowStartDateHours = Number(
    form.values.resetFrequency.windowStartDateUTC.time.split(":")[0],
  );
  const windowStartDateMinutes = Number(
    form.values.resetFrequency.windowStartDateUTC.time.split(":")[1]
      ? form.values.resetFrequency.windowStartDateUTC.time.split(":")[1]
      : "",
  );

  const windowStartDateYear = Number(
    form.values.resetFrequency.windowStartDateUTC.date.split("-")[0],
  );
  const windowStartDateMonth = Number(
    form.values.resetFrequency.windowStartDateUTC.date.split("-")[1],
  );
  const windowStartDateDay = Number(
    form.values.resetFrequency.windowStartDateUTC.date.split("-")[2],
  );

  return (
    <>
      <PageContentWrapper
        title={t("AGGREGATION_CONFIGURATION")}
        sections={[
          {
            id: "0",
            content: aggregationId ? (
              <ToggleContainerComponent
                isActive={form.values.isActive}
                onChangeFunc={form.setFieldValue}
              />
            ) : (
              <CreatorTitle>
                {t("CREATE_AGGREGATION_CONFIGURATION")}
              </CreatorTitle>
            ),
          },
          {
            id: "1",
            title: t("AGGREGATION_RULE_ID"),
            content: (
              <Input
                value={(aggregationId as string) || ""}
                disabled
                fullWidth
                loading={formLoading}
              />
            ),
            isHidden: !!!aggregationId,
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
                disabled={!!aggregationId}
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
            title: t("AGGREGATION_EVENT"),
            content: (
              <AggregationEventSelect
                onChange={aggregationEventSelectOnChange}
                value={form.values.eventConfigurationId}
                error={
                  form.touched.eventConfigurationId &&
                  form.errors.eventConfigurationId
                }
                disabled={!!aggregationId}
                loading={formLoading}
              />
            ),
          },
          {
            id: "5",
            title: t("RESET_FREQUENCY"),
            content: (
              <Radio
                name="resetFrequency.interval"
                options={frequencyOptions}
                value={form.values.resetFrequency.interval}
                type={RadioTypeEnum.HORIZONTAL}
                onChange={(_name, value) => {
                  form.setFieldValue("resetFrequency.interval", value);
                  form.setFieldValue(
                    "resetFrequency.intervalDetails.windowCountLimit",
                    value === IntervalEnum.NEVER ? undefined : 0,
                  );
                }}
                disabled={!!aggregationId}
                loading={formLoading}
              />
            ),
          },
          {
            id: "6",
            title: t("RESET_LENGTH"),
            content: (
              <Input
                name="resetFrequency.intervalDetails.length"
                value={
                  form.values.resetFrequency.interval === IntervalEnum.NEVER
                    ? ""
                    : form.values.resetFrequency.intervalDetails.length
                }
                type="number"
                onChange={form.handleChange}
                fullWidth
                disabled={
                  !!aggregationId ||
                  form.values.resetFrequency.interval === IntervalEnum.NEVER
                }
                error={
                  form.touched.resetFrequency?.intervalDetails?.length &&
                  form.errors.resetFrequency?.intervalDetails?.length
                }
                loading={formLoading}
              />
            ),
          },
          {
            id: "7",
            title: t("AGGREGATION_TYPE"),
            content: (
              <Radio
                name="aggregationType"
                options={aggregationTypeOptions}
                type={RadioTypeEnum.HORIZONTAL}
                // onChange={form.handleChange}
                onChange={(_name, value) =>
                  form.setFieldValue("aggregationType", value)
                }
                value={form.values.aggregationType}
                disabled={!!aggregationId}
                loading={formLoading}
              />
            ),
          },
          [
            {
              id: "8",
              title: t("FIRST_AGGREGATION"),
              isOptional: true,
              span: 12,
              content: (
                <Calender
                  disabled={!!aggregationId}
                  value={
                    form.values.resetFrequency.windowStartDateUTC.date !== ""
                      ? {
                          year: windowStartDateYear,
                          month: windowStartDateMonth,
                          day: windowStartDateDay,
                        }
                      : undefined
                  }
                  onClick={(date: any) =>
                    form.setFieldValue(
                      "resetFrequency.windowStartDateUTC.date",
                      `${date.year}-${date.month}-${date.day}`,
                    )
                  }
                  error={
                    form.touched.resetFrequency?.windowStartDateUTC?.date &&
                    form.errors.resetFrequency?.windowStartDateUTC?.date
                  }
                  fullWidth
                  loading={formLoading}
                  clearInput
                  onInputClear={() =>
                    form.setFieldValue(
                      "resetFrequency.windowStartDateUTC.date",
                      "",
                    )
                  }
                />
              ),
            },
            {
              id: "9",
              title: t("TIME"),
              isOptional: true,
              span: 12,
              content: (
                <TimePicker
                  value={
                    form.values.resetFrequency.windowStartDateUTC.time !== ""
                      ? {
                          hour: windowStartDateHours,
                          minute: windowStartDateMinutes,
                          second: 0,
                        }
                      : undefined
                  }
                  onTimeChange={(h, m, s) =>
                    form.setFieldValue(
                      "resetFrequency.windowStartDateUTC.time",
                      `${h}:${m}:${s}`,
                    )
                  }
                  error={
                    form.touched.resetFrequency?.windowStartDateUTC?.time &&
                    form.errors.resetFrequency?.windowStartDateUTC?.time
                  }
                  disabled={!!aggregationId}
                  fullWidth
                  loading={formLoading}
                  clearInput
                  onInputClear={() =>
                    form.setFieldValue(
                      "resetFrequency.windowStartDateUTC.time",
                      "",
                    )
                  }
                  disableSeconds
                />
              ),
            },
          ],
          {
            id: "10",
            title: t("NUMBER_OF_AGGREGATIONS"),
            isOptional: true,
            content: (
              <Row align="bottom" gutter={12}>
                <Col span={12}>
                  <Checkbox
                    label={t("UNLIMITED")}
                    checked={
                      form.values.resetFrequency.intervalDetails
                        .windowCountLimit === undefined ||
                      form.values.resetFrequency.interval === IntervalEnum.NEVER
                    }
                    onChange={(_name, isChecked) =>
                      form.setFieldValue(
                        "resetFrequency.intervalDetails.windowCountLimit",
                        isChecked ? undefined : 0,
                      )
                    }
                    disabled={
                      !!aggregationId ||
                      form.values.resetFrequency.interval === IntervalEnum.NEVER
                    }
                    loading={formLoading}
                  />
                </Col>
                <Col span={12}>
                  <Input
                    labelText={t("TIMES")}
                    name="resetFrequency.intervalDetails.windowCountLimit"
                    onChange={form.handleChange}
                    type="number"
                    value={
                      form.values.resetFrequency.intervalDetails
                        .windowCountLimit || ""
                    }
                    disabled={
                      form.values.resetFrequency.intervalDetails
                        .windowCountLimit === undefined ||
                      !!aggregationId ||
                      form.values.resetFrequency.interval === IntervalEnum.NEVER
                    }
                    fullWidth
                    loading={formLoading}
                  />
                </Col>
              </Row>
            ),
          },
          [
            {
              id: "11",
              title: t("AGGREGATION_OVER"),
              content: (
                <Select
                  onOptionChange={(value) =>
                    form.setFieldValue("aggregationFieldName", value)
                  }
                  value={form.values.aggregationFieldName}
                  error={
                    form.touched.aggregationFieldName &&
                    form.errors.aggregationFieldName
                  }
                  disabled={!!aggregationId}
                  options={eventFields.map((el) => ({
                    key: el.name,
                    value: el.name,
                  }))}
                  fullWidth
                  loading={formLoading}
                />
              ),
            },
            {
              id: "12",
              title: t("AGGREGATION_GROUP_OVER"),
              isOptional: true,
              content: (
                <Select
                  onOptionChange={(value) =>
                    form.setFieldValue("aggregationGroupByFieldName", value)
                  }
                  value={form.values.aggregationGroupByFieldName}
                  disabled={!!aggregationId}
                  options={eventFields.map((el) => ({
                    key: el.name,
                    value: el.name,
                  }))}
                  fullWidth
                  loading={formLoading}
                  addClearButton
                  onOptionClear={() =>
                    form.setFieldValue("aggregationGroupByFieldName", "")
                  }
                />
              ),
            },
          ],
          {
            id: "13",
            title: t("AGGREGATION_CONDITIONS"),
            titleHighlighted: true,
            content: (
              <AggregationConditionCreatorComponent
                form={form}
                eventFields={eventFields}
                loading={formLoading}
              />
            ),
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
            id: "18",
            content: (
              <ButtonContainer editMode={!!aggregationId}>
                {aggregationId && (
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
                        title={t("AGGREGATION_MUST_BE_INACTIVE")}
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
    </>
  );
};
