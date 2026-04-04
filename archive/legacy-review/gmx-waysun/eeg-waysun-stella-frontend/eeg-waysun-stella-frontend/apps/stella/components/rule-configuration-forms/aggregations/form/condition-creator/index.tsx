import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { Col } from "antd";
import { FieldArray, FormikProps, FormikProvider } from "formik";
import { useTranslation } from "next-export-i18n";
import { useRouter } from "next/router";
import React, { FC } from "react";
import { ErrorComponent, Input, Select } from "ui";
import { ConditionTypeEnum, FieldType } from "utils";
import {
  AddNewFieldContainer,
  CloseButton,
  AggregationFieldContainer,
} from "../../../../page-content-wrapper/index.styled";
import { AggregationFormTypes } from "../../container";

type AggregationConditionCreatorComponentProps = {
  form: FormikProps<AggregationFormTypes>;
  eventFields: Array<FieldType>;
  loading?: boolean;
};

export const AggregationConditionCreatorComponent: FC<
  AggregationConditionCreatorComponentProps
> = ({ form, eventFields, loading = false }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const aggregationId = router.query.id;

  return (
    <FormikProvider value={form}>
      <FieldArray name="aggregationConditions">
        {({ remove, push }) => (
          <>
            {form.values.aggregationConditions.map((_conditionField, idx) => (
              <AggregationFieldContainer key={idx} gutter={12}>
                <Col span={!!aggregationId ? 10 : 9}>
                  <Select
                    name={`aggregationConditions.${idx}.eventFieldName`}
                    value={
                      form.values.aggregationConditions[idx].eventFieldName
                    }
                    labelText={t("EVENT_FIELD")}
                    onOptionChange={(value) =>
                      form.setFieldValue(
                        `aggregationConditions.${idx}.eventFieldName`,
                        value,
                      )
                    }
                    disabled={!!aggregationId}
                    options={eventFields.map((el) => ({
                      key: el.name,
                      value: el.name,
                    }))}
                    error={
                      form.touched.aggregationConditions?.[idx]
                        ?.eventFieldName &&
                      typeof form.errors.aggregationConditions !== "string" &&
                      (form.errors.aggregationConditions?.[idx] as any)
                        ?.eventFieldName
                    }
                    fullWidth
                    loading={loading}
                  />
                </Col>
                <Col span={!!aggregationId ? 10 : 9}>
                  <Select
                    name={`aggregationConditions.${idx}.conditionType`}
                    value={form.values.aggregationConditions[idx].conditionType}
                    labelText={t("CONDITION")}
                    onOptionChange={(value) =>
                      form.setFieldValue(
                        `aggregationConditions.${idx}.conditionType`,
                        value,
                      )
                    }
                    disabled={!!aggregationId}
                    error={
                      form.touched.aggregationConditions?.[idx]
                        ?.conditionType &&
                      typeof form.errors.aggregationConditions !== "string" &&
                      (form.errors.aggregationConditions?.[idx] as any)
                        ?.conditionType
                    }
                    options={[
                      {
                        key: t("EQ"),
                        value: ConditionTypeEnum.EQ,
                      },
                      {
                        key: t("NEQ"),
                        value: ConditionTypeEnum.NEQ,
                      },
                      {
                        key: t("LT"),
                        value: ConditionTypeEnum.LT,
                      },
                      {
                        key: t("LE"),
                        value: ConditionTypeEnum.LE,
                      },
                      {
                        key: t("GT"),
                        value: ConditionTypeEnum.GT,
                      },
                      {
                        key: t("GE"),
                        value: ConditionTypeEnum.GE,
                      },
                      {
                        key: t("NN"),
                        value: ConditionTypeEnum.NN,
                      },
                    ]}
                    fullWidth
                    loading={loading}
                  />
                </Col>
                <Col span={!!aggregationId ? 4 : 5}>
                  <Input
                    value={form.values.aggregationConditions[idx].value}
                    name={`aggregationConditions.${idx}.value`}
                    onChange={form.handleChange}
                    labelText={t("VALUE")}
                    disabled={!!aggregationId}
                    error={
                      form.touched.aggregationConditions?.[idx]?.value &&
                      typeof form.errors.aggregationConditions !== "string" &&
                      (form.errors.aggregationConditions?.[idx] as any)?.value
                    }
                    fullWidth
                    loading={loading}
                  />
                </Col>
                {!aggregationId && (
                  <Col span={1}>
                    <CloseButton
                      buttonType="nobackground"
                      onClick={() => remove(idx)}
                      compact
                    >
                      <CloseOutlined />
                    </CloseButton>
                  </Col>
                )}
              </AggregationFieldContainer>
            ))}
            {!aggregationId && (
              <>
                <AddNewFieldContainer
                  onClick={() =>
                    push({
                      eventFieldName: "",
                      conditionType: "",
                      value: "",
                    })
                  }
                >
                  <PlusOutlined /> <span> {t("ADD_NEW_CONDITION")}</span>
                </AddNewFieldContainer>
                {form.touched.aggregationConditions &&
                  typeof form.errors.aggregationConditions === "string" && (
                    <ErrorComponent
                      errors={[form.errors.aggregationConditions]}
                      t={t}
                    />
                  )}
              </>
            )}
          </>
        )}
      </FieldArray>
    </FormikProvider>
  );
};
