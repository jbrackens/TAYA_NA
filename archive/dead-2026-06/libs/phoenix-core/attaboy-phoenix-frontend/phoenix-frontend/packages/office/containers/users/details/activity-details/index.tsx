import { TabsSection } from "../../../../components/layout/tabs/index.styled";
import {
  DollarCircleOutlined,
  HistoryOutlined,
  WalletOutlined,
  // ThunderboltOutlined,
  // MonitorOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { Tabs } from "antd";
import UsersDetailsBetsContainer from "../../bets";
import UsersDetailsWalletsContainer from "../../wallet";
import UsersDetailsSessionHistoryContainer from "../../session-history";
import UsersDetailsNotesContainer from "../../notes";
// import UsersDetailsAuditLogsContainer from "../../audit-log";
import { Id } from "@phoenix-ui/utils";
import { useTranslation } from "i18n";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { omit } from "lodash";
import UsersLimitsHistoryContainer from "../../limits-history";
import UsersCoolOffsHistoryContainer from "../../cool-offs-history";
// const {
//   SHOW_FOR_SUBMISSION,
// } = require("next/config").default().publicRuntimeConfig;

const { TabPane } = Tabs;

type ActivityDetailsProps = {
  id: Id;
};

export const ActivityDetails = ({ id }: ActivityDetailsProps) => {
  const { t } = useTranslation("page-users-details");
  const router = useRouter();

  const { activityDetails } = router.query as {
    activityDetails: string;
  };

  const onTabClick = (tabName: string) => {
    const queryWithoutPageAndLimit = omit(router.query, ["p", "limit"]);
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...queryWithoutPageAndLimit,
          activityDetails: tabName,
        },
      },
      undefined,
      {
        shallow: true,
      },
    );
  };

  useEffect(() => {
    if (!activityDetails) {
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
            activityDetails: "betsHistory",
          },
        },
        undefined,
        {
          shallow: true,
        },
      );
    }
  }, []);

  return (
    <>
      <TabsSection
        activeKey={activityDetails ? activityDetails : "betsHistory"}
        type="card"
        onTabClick={onTabClick}
        destroyInactiveTabPane
      >
        {/* {Number(SHOW_FOR_SUBMISSION) ? (
          <TabPane
            tab={
              <span>
                <ThunderboltOutlined />
                {t("HEADER_RECENT_ACTIVITIES")}
              </span>
            }
            key="recentActivities"
          >
            <UsersRecentActivity
                  data={recentActivities}
                  isLoading={isLoadingRecentActivities}
                />
          </TabPane>
        ) : (
          <></>
        )} */}
        <TabPane
          tab={
            <span>
              <DollarCircleOutlined />
              {t("HEADER_BETS_HISTORY")}
            </span>
          }
          key="betsHistory"
        >
          <UsersDetailsBetsContainer id={id} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <WalletOutlined />
              {t("HEADER_WALLET_HISTORY")}
            </span>
          }
          key="walletHistory"
        >
          <UsersDetailsWalletsContainer id={id} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              {t("HEADER_SESSION_HISTORY")}
            </span>
          }
          key="sessionHistory"
        >
          <UsersDetailsSessionHistoryContainer id={id} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <FolderOpenOutlined />
              {t("HEADER_NOTES")}
            </span>
          }
          key="notes"
        >
          <UsersDetailsNotesContainer id={id} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              {t("HEADER_LIMITS_HISTORY")}
            </span>
          }
          key="limitsHistory"
        >
          <UsersLimitsHistoryContainer id={id} />
        </TabPane>
        <TabPane
          tab={
            <span>
              <HistoryOutlined />
              {t("HEADER_COOL_OFF_HISTORY")}
            </span>
          }
          key="coolOffsHistory"
        >
          <UsersCoolOffsHistoryContainer id={id} />
        </TabPane>
        {/* {Number(SHOW_FOR_SUBMISSION) ? (
          <TabPane
            tab={
              <span>
                <MonitorOutlined />
                {t("HEADER_AUDIT_LOGS")}
              </span>
            }
            key="auditLogs"
          >
            <UsersDetailsAuditLogsContainer id={id} />
          </TabPane>
        ) : (
          <></>
        )} */}
      </TabsSection>
    </>
  );
};
