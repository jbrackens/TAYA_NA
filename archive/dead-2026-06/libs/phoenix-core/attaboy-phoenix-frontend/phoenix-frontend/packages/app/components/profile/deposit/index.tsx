import React, { useEffect } from "react";
import { useTranslation } from "i18n";
import { Row, Col } from "antd";
import { useApi } from "../../../services/api/api-service";
import { useSelector, useDispatch } from "react-redux";
import {
  selectAccountDepositLimits,
  selectAccountStakeLimits,
  selectAccountSessionLimits,
  selectCoolOff,
  selectStatus,
  selectIsUserDataLoading,
  setIsAccountDataUpdateNeeded,
  LimitEnum,
} from "../../../lib/slices/settingsSlice";
import {
  CardWithBorderBottom,
  ButtonMarginTopOverflowHidden,
  BreakMessage,
  CancelButton,
  BreakTimeContainer,
  MarginLeftRightContainer,
} from "./index.styled";
import { useState } from "react";
import { PunterStatusEnum } from "@phoenix-ui/utils";
import { CountDownComponent } from "../../count-down-time";
import { LimitForm } from "./limit-form";
import { ResultModalComponent } from "../../modals/result-modal";
import { StatusEnum } from "../../results";
import { useRouter } from "next/router";
import { CoreModal } from "../../ui/modal";
import { CoreForm } from "../../ui/form";
import { CoreInput } from "../../ui/input";

export enum LimitUnitEnum {
  NANOSECONDS = "NANOSECONDS",
  MICROSECONDS = "MICROSECONDS",
  MILLISECONDS = "MILLISECONDS",
  SECONDS = "SECONDS",
  MINUTES = "MINUTES",
  HOURS = "HOURS",
  DAYS = "DAYS",
}

const DepositLimitsComponent: React.FC = () => {
  const { t } = useTranslation(["deposit-limits"]);

  const depositLimits = useSelector(selectAccountDepositLimits);
  const stakeLimits = useSelector(selectAccountStakeLimits);
  const sessionLimits = useSelector(selectAccountSessionLimits);

  const userStatus = useSelector(selectStatus);
  const [status, setStatus] = useState<PunterStatusEnum | "">("");
  const userCoolOff = useSelector(selectCoolOff);
  const [coolOff, setCoolOff] = useState<
    { period: { startTime: string; endTime: string } } | undefined
  >(undefined);
  const isUserDataLoading = useSelector(selectIsUserDataLoading);
  const dispatch = useDispatch();
  const [isBreakModalVisible, setIsBreakModalVisible] = useState(false);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const breakApi = useApi(`punters/cool-off`, "POST");
  const selfExcludeApi = useApi(`punters/self-exclude`, "POST");
  const router = useRouter();

  useEffect(() => {
    if (userCoolOff !== undefined) {
      setCoolOff(userCoolOff);
    }
  }, [userCoolOff]);

  useEffect(() => {
    if (userStatus !== "") {
      setStatus(userStatus);
    }
  }, [userStatus]);

  const [form] = CoreForm.useForm();
  const [coolOffForm] = CoreForm.useForm();

  useEffect(() => {
    form.resetFields();
  }, [depositLimits]);

  const onBreakFormFinish = (values: any) => {
    breakApi.triggerApi({
      duration: { length: parseFloat(values.days), unit: "DAYS" },
    });
  };

  const displayBreakTime = () => {
    if (coolOff !== undefined) {
      return (
        <CountDownComponent
          periodName={t("CURRENT_BREAK")}
          time={coolOff?.period?.endTime}
        />
      );
    }
  };

  useEffect(() => {
    if (breakApi.error) {
      setIsBreakModalVisible(false);
      setIsErrorModalVisible(true);
      breakApi.resetHookState();
    }
  }, [breakApi.error]);

  useEffect(() => {
    if (breakApi.data) {
      setIsBreakModalVisible(false);
      dispatch(setIsAccountDataUpdateNeeded(true));
      setCoolOff(breakApi.data.coolOffPeriod);
    }
  }, [breakApi.data]);

  useEffect(() => {
    if (!isBreakModalVisible) {
      coolOffForm.resetFields();
    }
  }, [isBreakModalVisible]);

  const formatLimitLengthHours = (
    limit: {
      length: number;
      unit: LimitUnitEnum;
    } | null,
  ) => {
    if (limit === null) {
      return null;
    }
    switch (limit.unit) {
      case LimitUnitEnum.DAYS:
        return limit.length * 24;
      case LimitUnitEnum.HOURS:
        return limit.length;
      case LimitUnitEnum.MICROSECONDS:
        return limit.length / 3600000000;
      case LimitUnitEnum.MILLISECONDS:
        return limit.length / 3600000;
      case LimitUnitEnum.MINUTES:
        return limit.length / 60;
      case LimitUnitEnum.NANOSECONDS:
        return limit.length / 3600000000000;
      case LimitUnitEnum.SECONDS:
        return limit.length / 3600;
    }
  };

  const formatSessionLimits = () => ({
    daily: {
      ...sessionLimits.daily,
      current: {
        ...(sessionLimits.daily?.current && {
          limit: formatLimitLengthHours(sessionLimits.daily.current.limit),
          since: sessionLimits.daily.current.since,
        }),
      },
      ...(sessionLimits.daily?.next && {
        next: {
          ...(sessionLimits.daily?.next && {
            limit: formatLimitLengthHours(sessionLimits.daily.next.limit),
            since: sessionLimits.daily.next.since,
          }),
        },
      }),
    },

    weekly: {
      ...sessionLimits.weekly,
      current: {
        ...(sessionLimits.weekly?.current && {
          limit: formatLimitLengthHours(sessionLimits.weekly.current.limit),
          since: sessionLimits.weekly.current.since,
        }),
      },
      ...(sessionLimits.weekly?.next && {
        next: {
          ...(sessionLimits.weekly?.next && {
            limit: formatLimitLengthHours(sessionLimits.weekly.next.limit),
            since: sessionLimits.weekly.next.since,
          }),
        },
      }),
    },

    monthly: {
      ...sessionLimits.monthly,
      current: {
        ...(sessionLimits.monthly?.current && {
          limit: formatLimitLengthHours(sessionLimits.monthly.current.limit),
          since: sessionLimits.monthly.current.since,
        }),
      },
      ...(sessionLimits.monthly?.next && {
        next: {
          ...(sessionLimits.monthly?.next && {
            limit: formatLimitLengthHours(sessionLimits.monthly.next.limit),
            since: sessionLimits.monthly.next.since,
          }),
        },
      }),
    },
  });

  const formattedLimits = formatSessionLimits();

  return (
    <>
      <MarginLeftRightContainer>
        <CardWithBorderBottom bordered={false}>
          <p>{t("HELP_COPY")}</p>
        </CardWithBorderBottom>
      </MarginLeftRightContainer>
      <LimitForm
        title={"DEPOSIT_LIMITS"}
        values={depositLimits}
        url={"deposit-limits"}
        type={LimitEnum.DEPOSIT}
        isUserDataLoading={isUserDataLoading}
      />

      <LimitForm
        title={"STAKE_LIMITS"}
        values={stakeLimits}
        url={"stake-limits"}
        type={LimitEnum.STAKE}
        isUserDataLoading={isUserDataLoading}
      />

      <LimitForm
        title={"SESSION_LIMITS"}
        values={formattedLimits}
        url={"session-limits"}
        type={LimitEnum.SESSION}
        isUserDataLoading={isUserDataLoading}
      />

      <MarginLeftRightContainer>
        <CardWithBorderBottom bordered={false}>
          <Row gutter={[24, 24]}>
            <BreakMessage span={24}>{t("COOL_OFF")}</BreakMessage>
          </Row>
          <Row gutter={[24, 0]}>
            {status === PunterStatusEnum.COOLING_OFF ||
            status === PunterStatusEnum.SELF_EXCLUDED ? (
              <Col span={24}>
                {status === PunterStatusEnum.COOLING_OFF ? (
                  displayBreakTime()
                ) : (
                  <BreakTimeContainer>
                    {t("YOU_CANNOT_COOL_OFF_WHEN_SELF_EXCLUDED")}
                  </BreakTimeContainer>
                )}
              </Col>
            ) : (
              <Col
                xxl={{ span: 6 }}
                xl={{ span: 8 }}
                md={{ span: 8 }}
                sm={{ span: 24 }}
              >
                <ButtonMarginTopOverflowHidden
                  testId="coolOffButton"
                  size="large"
                  loading={breakApi.isLoading}
                  onClick={() => setIsBreakModalVisible(true)}
                  block
                  danger
                >
                  {t("START_COOL_OFF_PERIOD")}
                </ButtonMarginTopOverflowHidden>
              </Col>
            )}
          </Row>
        </CardWithBorderBottom>
      </MarginLeftRightContainer>

      <MarginLeftRightContainer>
        <CardWithBorderBottom bordered={false}>
          <Row gutter={[24, 24]}>
            <BreakMessage span={24}>{t("SELF_EXCLUSION")}</BreakMessage>
          </Row>
          <Row gutter={[24, 0]}>
            {status === PunterStatusEnum.SELF_EXCLUDED ? (
              <Col span={24}>
                <BreakTimeContainer>
                  {t("YOU_HAVE_SELF_EXCLUDED")}
                </BreakTimeContainer>
              </Col>
            ) : (
              <Col
                xxl={{ span: 6 }}
                xl={{ span: 8 }}
                md={{ span: 8 }}
                sm={{ span: 24 }}
              >
                <ButtonMarginTopOverflowHidden
                  testId="selfExcludeButton"
                  size="large"
                  loading={selfExcludeApi.isLoading}
                  onClick={() => {
                    router.push("/account/responsible-gaming/self-exclude");
                  }}
                  block
                  danger
                >
                  {t("I_WANT_TO_SELF_EXCLUDE")}
                </ButtonMarginTopOverflowHidden>
              </Col>
            )}
          </Row>
        </CardWithBorderBottom>
      </MarginLeftRightContainer>

      <CoreModal
        title={t("COOL_OFF")}
        centered
        visible={isBreakModalVisible}
        onCancel={() => setIsBreakModalVisible(false)}
        onOk={() => setIsBreakModalVisible(false)}
        maskClosable={false}
        footer={null}
      >
        <CoreForm
          layout="vertical"
          onFinish={onBreakFormFinish}
          testId="coolOffModalForm"
          form={coolOffForm}
        >
          <p>{t("DESCRIPTION")}</p>
          <CoreForm.Item
            label={t("NUMBER_OF_DAYS")}
            name="days"
            validateFirst={true}
            rules={[
              {
                message: t("DAYS_ERROR"),
                required: true,
                pattern: new RegExp("^[0-9]*$"),
              },
              ({}) => ({
                validator(_rule, value) {
                  if (!value) {
                    return Promise.reject(t("DAYS_ERROR"));
                  }
                  if (value < 3) {
                    return Promise.reject(t("DAYS_MIN_ERROR"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <CoreInput type="number" testId="coolOffInput" />
          </CoreForm.Item>
          <CoreForm.Item>
            <ButtonMarginTopOverflowHidden
              loading={breakApi.isLoading}
              type="primary"
              htmlType="submit"
              size="large"
              block
              testId="startCoolOffButton"
              danger
            >
              {t("START_COOL_OFF")}
            </ButtonMarginTopOverflowHidden>
          </CoreForm.Item>
          <CoreForm.Item>
            <CancelButton
              type="default"
              size="large"
              onClick={() => setIsBreakModalVisible(false)}
              block
            >
              {t("CANCEL")}
            </CancelButton>
          </CoreForm.Item>
        </CoreForm>
      </CoreModal>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        subTitle={t("API_ERROR")}
        onOk={() => setIsErrorModalVisible(false)}
        okText={t("OK")}
        isVisible={isErrorModalVisible}
      />
    </>
  );
};

export { DepositLimitsComponent };
