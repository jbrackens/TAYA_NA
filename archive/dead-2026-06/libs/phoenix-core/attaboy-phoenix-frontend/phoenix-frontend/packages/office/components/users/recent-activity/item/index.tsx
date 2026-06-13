import React from "react";
import { Typography, Timeline, Tag } from "antd";
import {
  DollarCircleOutlined,
  TrophyOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import {
  TalonPunterActivity,
  TalonPunterActivityEnum,
  TalonPunterRecentActivityItem,
} from "../../../../types/punters.d";
import { useTimezone } from "@phoenix-ui/utils";

const { Text, Paragraph } = Typography;

const formatDataLine = (type: TalonPunterActivity, data: any) => {
  switch (type) {
    case TalonPunterActivityEnum.BET_PLACEMENT:
      return (
        <Tag color="geekblue">
          {data.unit}
          {data.amount}
        </Tag>
      );
    case TalonPunterActivityEnum.BET_WON:
      return (
        <Tag color="gold">
          +{data.unit}
          {data.amount}
        </Tag>
      );
    case TalonPunterActivityEnum.SYSTEM_LOGIN:
      return (
        <Text ellipsis style={{ fontSize: 11, color: "grey" }}>
          {data.ip}
        </Text>
      );
  }
};

const UserTalonPunterRecentActivityItem = ({
  date,
  type,
  message,
  data,
}: TalonPunterRecentActivityItem) => {
  const { t } = useTranslation("common");

  let IconComponent;
  let color;
  switch (type) {
    case TalonPunterActivityEnum.BET_PLACEMENT:
      IconComponent = DollarCircleOutlined;
      color = "gree";
      break;
    case TalonPunterActivityEnum.BET_WON:
      IconComponent = TrophyOutlined;
      color = "gold";
      break;
    case TalonPunterActivityEnum.SYSTEM_LOGIN:
      IconComponent = CloudServerOutlined;
      color = "geekblue";
      break;
  }

  const { getTimeWithTimezone } = useTimezone();

  return (
    <Timeline.Item
      dot={IconComponent ? <IconComponent size={16} /> : null}
      color={color}
    >
      <Text strong>
        {getTimeWithTimezone(dayjs(date)).format(t("DATE_TIME_FORMAT"))}
      </Text>
      <Paragraph>
        <Text>{message}</Text>
      </Paragraph>
      <Paragraph>{formatDataLine(type, data)}</Paragraph>
    </Timeline.Item>
  );
};

export default UserTalonPunterRecentActivityItem;
