import { Typography, Drawer, Timeline, Skeleton } from "antd";
import { useTranslation } from "i18n";
import UserOfficePunterRecentActivityItem from "./item";
import { OfficePunterRecentActivityItem } from "../../../types/punters";

export type OfficePuntersRecentActivityProps = {
  data?: OfficePunterRecentActivityItem[];
  isLoading: boolean | undefined;
};

export type OfficePuntersRecentActivityDrawerProps = {
  data?: OfficePunterRecentActivityItem[];
  horizontal?: boolean;
  visible: boolean | undefined;
  isLoading: boolean | undefined;
  onClose: any;
};

export const UsersRecentActivity = ({
  data = [],
  isLoading,
}: OfficePuntersRecentActivityProps) => {
  return (
    <Typography>
      <Skeleton loading={isLoading} active>
        <Timeline>
          {data.map((item: OfficePunterRecentActivityItem) => (
            <UserOfficePunterRecentActivityItem key={item.id} {...item} />
          ))}
        </Timeline>
      </Skeleton>
    </Typography>
  );
};

const UsersRecentActivityDrawer = ({
  data = [],
  visible,
  isLoading,
  onClose,
}: OfficePuntersRecentActivityDrawerProps) => {
  const { t } = useTranslation("page-users");

  return (
    <Drawer
      width="30%"
      placement="right"
      title={t("HEADER_RECENT_ACTIVITIES")}
      closable={false}
      onClose={onClose}
      open={visible}
    >
      <UsersRecentActivity data={data} isLoading={isLoading} />
    </Drawer>
  );
};

export default UsersRecentActivityDrawer;
