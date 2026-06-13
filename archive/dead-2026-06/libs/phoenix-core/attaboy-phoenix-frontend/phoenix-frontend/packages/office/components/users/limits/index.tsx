import React from "react";
import { Descriptions } from "antd";
import { Layout, PunterStandardLimitsScope } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";

type UsersDetailsLimitsProps = {
  data: PunterStandardLimitsScope;
  label: string;
  formatter?: Function;
  unit?: string;
  precision?: number;
  separator?: string;
  prefixed?: boolean;
};

const UsersDetailsLimits = ({
  data = {
    daily: {
      current: { limit: null, since: "" },
    },
    weekly: {
      current: { limit: null, since: "" },
    },
    monthly: {
      current: { limit: null, since: "" },
    },
  },
  label,
  unit,
  formatter,
  separator = "",
  precision = 2,
  prefixed = true,
}: UsersDetailsLimitsProps) => {
  const { t } = useTranslation("page-users-details");
  const formatValue = (value: number | null) => {
    if (!value) {
      return "N/A";
    }

    if (unit && !formatter) {
      return prefixed
        ? `${unit}${separator}${value.toFixed(precision)}`
        : `${value.toFixed(precision)}${separator}${unit}`;
    }
    return formatter ? formatter(value, unit) : value;
  };

  return (
    <Descriptions
      column={1}
      size={Layout.Size.SMALL}
      layout={Layout.Direction.HORIZONTAL}
      title={label}
    >
      <Descriptions.Item
        labelStyle={{ fontStyle: "italic" }}
        label={t("HEADER_CARD_LIMITS_DAILY")}
      >
        <span role="daily">{formatValue(data.daily.current.limit)}</span>
      </Descriptions.Item>
      <Descriptions.Item
        labelStyle={{ fontStyle: "italic" }}
        label={t("HEADER_CARD_LIMITS_WEEKLY")}
      >
        <span role="weekly">{formatValue(data.weekly.current.limit)}</span>
      </Descriptions.Item>
      <Descriptions.Item
        labelStyle={{ fontStyle: "italic" }}
        label={t("HEADER_CARD_LIMITS_MONTHLY")}
      >
        <span role="monthly">{formatValue(data.monthly.current.limit)}</span>
      </Descriptions.Item>
    </Descriptions>
  );
};

export default UsersDetailsLimits;
