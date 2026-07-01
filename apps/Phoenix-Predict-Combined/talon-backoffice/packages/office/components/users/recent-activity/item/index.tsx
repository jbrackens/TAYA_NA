import { Typography, Timeline, Tag } from "antd";
import {
  ProfileOutlined,
  TrophyOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "i18n";
import {
  TalonPunterActivity,
  TalonPunterActivityEnum,
  TalonPunterRecentActivityItem,
} from "../../../../types/punters";
import { useTimezone } from "@phoenix-ui/utils";

const { Text, Paragraph } = Typography;

const formatPointTag = (amount: unknown, positive = false) => {
  const prefix = positive ? "+" : "";
  return `${prefix}${amount ?? 0} pts`;
};

const formatDataLine = (type: TalonPunterActivity, data: any) => {
  switch (type) {
    case TalonPunterActivityEnum.PREDICTION_ORDER:
      return <Tag color="geekblue">{formatPointTag(data.amount)}</Tag>;
    case TalonPunterActivityEnum.PREDICTION_RESULT:
      return <Tag color="gold">{formatPointTag(data.amount, true)}</Tag>;
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
    case TalonPunterActivityEnum.PREDICTION_ORDER:
      IconComponent = ProfileOutlined;
      color = "green";
      break;
    case TalonPunterActivityEnum.PREDICTION_RESULT:
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
