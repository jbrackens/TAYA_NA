import React, { FC } from "react";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { Col } from "antd";
import { FieldArray, FormikProps, FormikProvider } from "formik";
import { useRouter } from "next/router";
import { ErrorComponent, Input, Select } from "ui";
import { AggregationTypeEnum, ConditionTypeEnum } from "utils";
import { AddNewFieldContainer } from "../../../../page-content-wrapper/index.styled";
import { AchievementFormTypes } from "../../container";
import {
  AchievementConditionContainer,
  StyledDeleteButton,
} from "./index.styled";
import { TableContainer } from "../../../../table-container";
import { useTranslation } from "next-export-i18n";

type AggType = {
  key: string;
  name: string;
};

type AchievementsConditionCreatorComponentProps = {
  form: FormikProps<AchievementFormTypes>;
  loading?: boolean;
  aggregations: Array<AggType>;
};

export const AchievementsConditionCreatorComponent: FC<
  AchievementsConditionCreatorComponentProps
> = ({ form, loading = false, aggregations }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const achievementId = router.query.id;

  return (
    <FormikProvider value={form}>
      <FieldArray name="conditions">
        {({ remove, push }) => (
          <TableContainer
            title={t("CONDITIONS")}
            body={
              <>
                {form.values.conditions.map((_conditionField, idx) => (
                  <AchievementConditionContainer key={idx} gutter={12}>
                    <Col span={8}>
                      <Select
                        name={`conditions.${idx}.aggregationRuleId`}
                        value={form.values.conditions[idx].aggregationRuleId}
                        selectedKey={
                          form.values.conditions[idx].aggregationRuleId
                        }
                        labelText={t("AGGREGATIONS")}
                        onOptionChange={(value) =>
                          form.setFieldValue(
                            `conditions.${idx}.aggregationRuleId`,
                            value,
                          )
                        }
                        disabled={!!achievementId}
                        options={aggregations.map((el) => ({
                          key: el.key,
                          value: el.name,
                        }))}
                        error={
                          form.touched.conditions?.[idx]?.aggregationRuleId &&
                          typeof form.errors.conditions !== "string" &&
                          (form.errors.conditions?.[idx] as any)
                            ?.aggregationRuleId
                        }
                        fullWidth
                        search
                        loading={loading}
                        addClearButton
                        onOptionClear={() =>
                          form.setFieldValue(
                            `conditions.${idx}.aggregationRuleId`,
                            "",
                          )
                        }
                      />
                    </Col>
                    <Col span={6}>
                      <Select
                        name={`conditions.${idx}.aggregationField`}
                        value={form.values.conditions[idx].aggregationField}
                        labelText={t("FIELD")}
                        onOptionChange={(value) =>
                          form.setFieldValue(
                            `conditions.${idx}.aggregationField`,
                            value,
                          )
                        }
                        disabled={!!achievementId}
                        error={
                          form.touched.conditions?.[idx]?.aggregationField &&
                          typeof form.errors.conditions !== "string" &&
                          (form.errors.conditions?.[idx] as any)
                            ?.aggregationField
                        }
                        options={[
                          {
                            key: t("COUNT"),
                            value: AggregationTypeEnum.COUNT,
                          },
                          {
                            key: t("MIN"),
                            value: AggregationTypeEnum.MIN,
                          },
                          {
                            key: t("MAX"),
                            value: AggregationTypeEnum.MAX,
                          },
                          {
                            key: t("SUM"),
                            value: AggregationTypeEnum.SUM,
                          },
                        ]}
                        fullWidth
                        loading={loading}
                      />
                    </Col>
                    <Col span={6}>
                      <Select
                        name={`conditions.${idx}.conditionType`}
                        value={form.values.conditions[idx].conditionType}
                        labelText={t("TYPE")}
                        onOptionChange={(value) =>
                          form.setFieldValue(
                            `conditions.${idx}.conditionType`,
                            value,
                          )
                        }
                        disabled={!!achievementId}
                        error={
                          form.touched.conditions?.[idx]?.conditionType &&
                          typeof form.errors.conditions !== "string" &&
                          (form.errors.conditions?.[idx] as any)?.conditionType
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
                    <Col span={3}>
                      <Input
                        value={form.values.conditions[idx].value}
                        name={`conditions.${idx}.value`}
                        onChange={form.handleChange}
                        labelText={t("VALUE")}
                        disabled={!!achievementId}
                        error={
                          form.touched.conditions?.[idx]?.value &&
                          typeof form.errors.conditions !== "string" &&
                          (form.errors.conditions?.[idx] as any)?.value
                        }
                        fullWidth
                        loading={loading}
                      />
                    </Col>

                    {!achievementId && (
                      <Col span={1}>
                        <StyledDeleteButton
                          buttonType="nobackground"
                          onClick={() => remove(idx)}
                          compact
                        >
                          <CloseOutlined />
                        </StyledDeleteButton>
                      </Col>
                    )}
                  </AchievementConditionContainer>
                ))}
                {!achievementId && (
                  <>
                    <AddNewFieldContainer
                      onClick={() =>
                        push({
                          aggregationRuleId: "",
                          aggregationField: AggregationTypeEnum.COUNT,
                          conditionType: ConditionTypeEnum.EQ,
                          value: "",
                        })
                      }
                    >
                      <PlusOutlined /> <span> {t("ADD_NEW_FIELD")}</span>
                    </AddNewFieldContainer>
                    {form.touched.conditions &&
                      typeof form.errors.conditions === "string" && (
                        <ErrorComponent
                          errors={[form.errors.conditions]}
                          t={t}
                        />
                      )}
                  </>
                )}
              </>
            }
          />
        )}
      </FieldArray>
    </FormikProvider>
  );
};
