import React from "react";
import { Row, Col, Form } from "antd";
import { useTranslation } from "i18n";
import InputNumber from "../../../form/input-number";

type UsersDetailsLimitsSectionProps = {
  field: string;
  disabled: boolean;
  precision?: number;
  separator?: string;
  unit?: string;
  unitAsPrefix?: boolean;
  formatter?: Function;
  parser?: Function;
  step?: number;
  defaultValue?: number;
};

const UsersDetailsLimitsSection: React.FC<UsersDetailsLimitsSectionProps> = ({
  field,
  disabled,
  precision = 2,
  separator = "",
  unit,
  unitAsPrefix = true,
  step = 1,
  defaultValue = 0,
  formatter,
  parser,
}: UsersDetailsLimitsSectionProps) => {
  const { t } = useTranslation("page-users-details");

  const formatUnit = (value: any) =>
    unitAsPrefix
      ? `${unit}${separator}${value}`
      : `${value}${separator}${unit}`;

  const defaultValueWithUnit = unit
    ? formatUnit(defaultValue)
    : `${defaultValue}`;

  const valueFormatter = (value: any = defaultValue) => {
    if (formatter) {
      return formatter(value, unit, separator);
    }
    return unit ? formatUnit(value) : value;
  };

  const valueParser = (value = defaultValueWithUnit) => {
    if (unit && !parser) {
      return value.replace(`${separator}${unit}`, "");
    }
    return parser ? parser(value, unit) : value;
  };

  return (
    <Row gutter={16}>
      <Col span={8} sm={8} xs={24}>
        <Form.Item
          label={t("HEADER_CARD_LIMITS_DAILY")}
          name={[field, "daily"]}
        >
          <InputNumber
            disabled={disabled}
            min={0}
            step={step}
            precision={precision}
            formatter={valueFormatter}
            parser={valueParser}
          />
        </Form.Item>
      </Col>
      <Col span={8} sm={8} xs={24}>
        <Form.Item
          label={t("HEADER_CARD_LIMITS_WEEKLY")}
          name={[field, "weekly"]}
        >
          <InputNumber
            disabled={disabled}
            min={0}
            step={step}
            precision={precision}
            formatter={valueFormatter}
            parser={valueParser}
          />
        </Form.Item>
      </Col>
      <Col span={8} sm={8} xs={24}>
        <Form.Item
          label={t("HEADER_CARD_LIMITS_MONTHLY")}
          name={[field, "monthly"]}
        >
          <InputNumber
            disabled={disabled}
            min={0}
            step={step}
            precision={precision}
            formatter={valueFormatter}
            parser={valueParser}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};

export default UsersDetailsLimitsSection;
