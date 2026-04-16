import React from "react";
import { Typography, Drawer, Timeline, Skeleton } from "antd";
import { useTranslation } from "i18n";
import UserTalonPunterRecentActivityItem from "./item";
import { TalonPunterRecentActivityItem } from "../../../types/punters.d";

export type TalonPuntersRecentActivityProps = {
  data?: TalonPunterRecentActivityItem[];
  isLoading: boolean | undefined;
};

export type TalonPuntersRecentActivityDrawerProps = {
  data?: TalonPunterRecentActivityItem[];
  horizontal?: boolean;
  visible: boolean | undefined;
  isLoading: boolean | undefined;
  onClose: any;
};

export const UsersRecentActivity = ({
  data = [],
  isLoading,
}: TalonPuntersRecentActivityProps) => {
  return (
    <Typography>
      <Skeleton loading={isLoading} active>
        <Timeline>
          {data.map((item: TalonPunterRecentActivityItem) => (
            <UserTalonPunterRecentActivityItem key={item.id} {...item} />
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
}: TalonPuntersRecentActivityDrawerProps) => {
  const { t } = useTranslation("page-users");

  return (
    <Drawer
      width="30%"
      placement="right"
      title={t("HEADER_RECENT_ACTIVITIES")}
      closable={false}
      onClose={onClose}
      visible={visible}
    >
      <UsersRecentActivity data={data} isLoading={isLoading} />
    </Drawer>
  );
};

export default UsersRecentActivityDrawer;
