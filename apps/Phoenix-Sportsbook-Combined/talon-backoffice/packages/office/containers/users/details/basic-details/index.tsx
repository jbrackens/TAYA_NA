import { useState, useEffect } from "react";
import {
  TabsUserDetails,
  DescriptionItemText,
  DescriptionItemLink,
} from "../index.styled";
import { Tabs, Card, Row, Col, Descriptions, Checkbox, Spin } from "antd";
import UsersDetailsLimits from "../../../../components/users/limits";
import UsersDetailsLimitsUpdate from "../../../../components/users/limits/update";
import {
  EditOutlined,
  IdcardOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { useTranslation } from "i18n";
import {
  Method,
  // Button as ButtonEnum,
  numberToHours,
} from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { TalonPunter } from "../../../../types/punters";
import { FormValues } from "../../../../components/form/modal";
import { useApi } from "../../../../services/api/api-service";

enum SsnVisibilityEnum {
  HIDDEN = "HIDDEN",
  PARTIAL = "PARTIAL",
  FULL = "FULL",
}

type SsnVisibilityType =
  | SsnVisibilityEnum.FULL
  | SsnVisibilityEnum.HIDDEN
  | SsnVisibilityEnum.PARTIAL;

type BasicDetailsProps = {
  Layout: any;
  basicData: TalonPunter;
  setLimitsModalVisible: (visible: boolean) => void;
  limitsModalVisible: boolean;
  onSubmitUpdateLimits: (values: FormValues) => void;
  limitsUpdateInProgress: boolean;
  setForceUpdate: (update: boolean) => void;
  userDataLoading: boolean;
  editUserDetails: (field: string, value: {}, customvalidation?: any) => void;
};

const TIME_TO_HIDE_SSN = 60000;

export const BasicDetails = ({
  Layout,
  basicData,
  setLimitsModalVisible,
  limitsModalVisible,
  onSubmitUpdateLimits,
  limitsUpdateInProgress,
  setForceUpdate,
  userDataLoading,
  editUserDetails,
}: BasicDetailsProps) => {
  const { t } = useTranslation("page-users-details");
  const { TabPane } = Tabs;
  const router = useRouter();
  const [ssnVisibility, setSsnVisibility] = useState<SsnVisibilityType>(
    SsnVisibilityEnum.HIDDEN,
  );

  let hideSsnTimeout: null | ReturnType<typeof setTimeout> = null;

  const [fullSsn, setFullSsn] = useState<undefined | string>(
    t("FULL_SSN_MISSING"),
  );

  const [triggerApi, isLoading, response] = useApi(
    "admin/punters/:id/detail/ssn",
    Method.GET,
  );

  useEffect(() => {
    if (ssnVisibility !== SsnVisibilityEnum.HIDDEN) {
      hideSsnTimeout = setTimeout(() => {
        setSsnVisibility(SsnVisibilityEnum.HIDDEN);
      }, TIME_TO_HIDE_SSN);
    }

    if (ssnVisibility === SsnVisibilityEnum.HIDDEN && !!hideSsnTimeout) {
      clearTimeout(hideSsnTimeout);
    }

    return () => {
      if (!!hideSsnTimeout) {
        clearTimeout(hideSsnTimeout);
      }
    };
  }, [ssnVisibility]);

  useEffect(() => {
    setSsnVisibility(SsnVisibilityEnum.HIDDEN);
  }, [basicData]);

  useEffect(() => {
    if (response.succeeded) {
      setFullSsn(response.data?.ssn);
    }
  }, [response]);

  useEffect(() => {
    const fetchUserFullSsn = async () => {
      try {
        await triggerApi(undefined, {
          id: basicData.userId,
        });
      } catch (err) {
        console.error({ err });
      }
    };
    if (ssnVisibility === SsnVisibilityEnum.FULL && basicData.userId) {
      fetchUserFullSsn();
    }
  }, [ssnVisibility]);

  const { basicDetails } = router.query as {
    basicDetails: string;
  };

  const sessionLimitsDataToDisplay = {
    daily: {
      current: {
        limit: basicData.sessionLimits.daily.current.limit
          ? basicData.sessionLimits.daily.current.limit.length
          : null,
        since: basicData.sessionLimits.daily.current.since,
      },
    },
    monthly: {
      current: {
        limit: basicData.sessionLimits.monthly.current.limit
          ? basicData.sessionLimits.monthly.current.limit.length
          : null,
        since: basicData.sessionLimits.monthly.current.since,
      },
    },
    weekly: {
      current: {
        limit: basicData.sessionLimits.weekly.current.limit
          ? basicData.sessionLimits.weekly.current.limit.length
          : null,
        since: basicData.sessionLimits.weekly.current.since,
      },
    },
  };

  const onTabClick = (tabName: string) => {
    setForceUpdate(true);
    router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          basicDetails: tabName,
        },
      },
      undefined,
      {
        shallow: true,
      },
    );
  };

  const onClickChangeMaskSsn = () => {
    ssnVisibility === SsnVisibilityEnum.HIDDEN &&
      setSsnVisibility(SsnVisibilityEnum.PARTIAL);

    ssnVisibility === SsnVisibilityEnum.PARTIAL &&
      setSsnVisibility(SsnVisibilityEnum.FULL);

    ssnVisibility === SsnVisibilityEnum.FULL &&
      setSsnVisibility(SsnVisibilityEnum.HIDDEN);
  };

  const phoneEditButtonClicked = () => {
    editUserDetails("phone", { Phone: basicData.phoneNumber });
  };

  const ssnEditButtonClicked = () => {
    editUserDetails("ssn", { SSN: "" });
  };

  const dobEditButtonClicked = () => {
    editUserDetails("dob", {
      Month: basicData.dateOfBirth.month,
      Day: basicData.dateOfBirth.day,
      Year: basicData.dateOfBirth.year,
    });
  };

  const addressEditButtonClicked = () => {
    editUserDetails("address", {
      AddressLine: basicData.address.addressLine,
      City: basicData.address.city,
      State: basicData.address.state,
      Zipcode: basicData.address.zipcode,
      Country: basicData.address.country,
    });
  };

  return (
    <TabsUserDetails
      activeKey={basicDetails ? basicDetails : "personalDetails"}
      type="card"
      onTabClick={onTabClick}
      role="userDetailTabs"
    >
      <TabPane
        tab={
          <span>
            <IdcardOutlined />
            {t("HEADER_CARD_DETAILS")}
          </span>
        }
        key="personalDetails"
      >
        <Card
          // extra={
          //   Number(SHOW_FOR_SUBMISSION)
          //     ? [
          //         <Button
          //           key="punter-details"
          //           type={ButtonEnum.Type.LINK}
          //           icon={<EditOutlined />}
          //           onClick={() => {}}
          //         >
          //           {t("ACTION_CHANGE")}
          //         </Button>,
          //       ]
          //     : []
          // }
          loading={userDataLoading}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Descriptions
                column={1}
                size={Layout.Size.SMALL}
                layout={Layout.Direction.VERTICAL}
              >
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_USERID")}
                >
                  <span role="userId">{basicData.userId}</span>
                </Descriptions.Item>
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_USERNAME")}
                >
                  <span role="userName">{basicData.username}</span>
                </Descriptions.Item>
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_EMAIL")}
                >
                  <span role="email">{basicData.email}</span>
                </Descriptions.Item>
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_PHONE")}
                >
                  <span role="phoneNumber">{basicData.phoneNumber}</span>
                  <DescriptionItemLink
                    className="extra-left"
                    onClick={phoneEditButtonClicked}
                  >
                    <EditOutlined />
                  </DescriptionItemLink>
                </Descriptions.Item>
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_SSN")}
                >
                  {ssnVisibility !== SsnVisibilityEnum.HIDDEN && (
                    <>
                      <DescriptionItemText>
                        {ssnVisibility === SsnVisibilityEnum.PARTIAL ? (
                          <span role="ssn">{basicData.ssn}</span>
                        ) : isLoading ? (
                          <Spin />
                        ) : (
                          fullSsn
                        )}
                      </DescriptionItemText>
                      <DescriptionItemLink onClick={ssnEditButtonClicked}>
                        <EditOutlined />
                      </DescriptionItemLink>
                    </>
                  )}
                  <DescriptionItemLink onClick={onClickChangeMaskSsn}>
                    {(ssnVisibility === SsnVisibilityEnum.HIDDEN &&
                      t("REVEAL_LINK_TEXT")) ||
                      (ssnVisibility === SsnVisibilityEnum.PARTIAL &&
                        t("REVEAL_FULL_SSN_LINK_TEXT")) ||
                      (ssnVisibility === SsnVisibilityEnum.FULL &&
                        t("HIDE_LINK_TEXT"))}
                  </DescriptionItemLink>
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={12}>
              <Descriptions
                column={1}
                size={Layout.Size.SMALL}
                layout={Layout.Direction.VERTICAL}
              >
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_DOB")}
                >
                  <span role="dateOfBirth">
                    {basicData.dateOfBirth.month}/{basicData.dateOfBirth.day}/
                    {basicData.dateOfBirth.year}
                  </span>
                  <DescriptionItemLink
                    className="extra-left"
                    onClick={dobEditButtonClicked}
                  >
                    <EditOutlined />
                  </DescriptionItemLink>
                </Descriptions.Item>
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_ADDRESS")}
                >
                  <div role="address">
                    {basicData.address.addressLine}
                    <br />
                    {basicData.address.city}
                    <br />
                    {basicData.address.state}
                    <br />
                    {basicData.address.zipcode}
                    <br />
                    {basicData.address.country}
                    <br />
                    <DescriptionItemLink onClick={addressEditButtonClicked}>
                      <EditOutlined />
                    </DescriptionItemLink>
                  </div>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>
      </TabPane>
      <TabPane
        tab={
          <span>
            <IdcardOutlined />
            {t("HEADER_CARD_PREF")}
          </span>
        }
        key="preferences"
      >
        <Card
          // extra={
          //   Number(SHOW_FOR_SUBMISSION)
          //     ? [
          //         <Button
          //           key="punter-details"
          //           type={ButtonEnum.Type.LINK}
          //           icon={<EditOutlined />}
          //           onClick={() => {}}
          //         >
          //           {t("ACTION_CHANGE")}
          //         </Button>,
          //       ]
          //     : []
          // }
          loading={userDataLoading}
        >
          <Row gutter={16}>
            <Col span={17}>
              <Descriptions
                column={1}
                size={Layout.Size.SMALL}
                layout={Layout.Direction.VERTICAL}
              >
                <Descriptions.Item
                  labelStyle={{ fontWeight: "bold" }}
                  label={t("HEADER_CARD_DETAILS_COMMS")}
                >
                  <Checkbox.Group style={{ width: "100%" }}>
                    <Row>
                      <Col span={24}>
                        <Checkbox
                          value="A"
                          indeterminate={
                            basicData.communicationPreferences.announcements
                          }
                          disabled={true}
                        >
                          {t("HEADER_CARD_DETAILS_ANNOUNCEMENTS")}
                        </Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox
                          value="B"
                          indeterminate={
                            basicData.communicationPreferences.promotions
                          }
                          disabled={true}
                        >
                          {t("HEADER_CARD_DETAILS_PROMOTIONS")}
                        </Checkbox>
                      </Col>
                      <Col span={24}>
                        <Checkbox
                          value="C"
                          indeterminate={
                            basicData.communicationPreferences
                              .signInNotifications
                          }
                          disabled={true}
                        >
                          {t("HEADER_CARD_DETAILS_SIGNIN")}
                        </Checkbox>
                      </Col>
                    </Row>
                  </Checkbox.Group>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>
      </TabPane>
      <TabPane
        tab={
          <span>
            <FileProtectOutlined />
            {t("HEADER_CARD_LIMITS")}
          </span>
        }
        key="limits"
      >
        <Card
        // extra={[
        //   <Button
        //     key="punter-limits"
        //     type={ButtonEnum.Type.LINK}
        //     icon={<EditOutlined />}
        //     onClick={() => setLimitsModalVisible(true)}
        //   >
        //     {t("ACTION_CHANGE")}
        //   </Button>,
        // ]}
        >
          <Row gutter={16}>
            <Col span={8}>
              <UsersDetailsLimits
                data={basicData.depositLimits}
                label={t("HEADER_CARD_LIMITS_DEPOSIT")}
                unit="$"
              />
            </Col>
            <Col span={8}>
              <UsersDetailsLimits
                data={basicData.stakeLimits}
                label={t("HEADER_CARD_LIMITS_LOSS")}
                unit="$"
              />
            </Col>
            <Col span={8}>
              <UsersDetailsLimits
                data={sessionLimitsDataToDisplay}
                label={t("HEADER_CARD_LIMITS_SESSION")}
                formatter={numberToHours}
              />
            </Col>
          </Row>

          <UsersDetailsLimitsUpdate
            data={{
              deposits: basicData.depositLimits,
              stake: basicData.stakeLimits,
              session: basicData.sessionLimits,
            }}
            visible={limitsModalVisible}
            loading={limitsUpdateInProgress}
            onClose={() => setLimitsModalVisible(false)}
            onSubmit={onSubmitUpdateLimits}
          />
        </Card>
      </TabPane>
    </TabsUserDetails>
  );
};
