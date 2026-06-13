import React, { useEffect, useState } from "react";
import { useTranslation } from "i18n";
import { message, Row, Col } from "antd";
import { CoreSpin } from "./../../../ui/spin";
import { useApi } from "../../../../services/api/api-service";
import { useDispatch } from "react-redux";
import { setUserLimits, LimitEnum } from "../../../../lib/slices/settingsSlice";
import {
  CardWithBorderBottom,
  MessageContainer,
  RowMarginTop,
  SaveButton,
  LimitsTitle,
} from "../index.styled";
import { FormForLimts } from "./index.styled";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import duration from "dayjs/plugin/duration";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { LimitUnitEnum } from "..";
import { CoreInputNumber } from "../../../ui/inputNumber";
import { CoreForm } from "../../../ui/form";
import { useTimezone } from "@phoenix-ui/utils";
dayjs.extend(LocalizedFormat);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.Ls.en.weekStart = 1;

type limitFormat = {
  limit: any;
  since: any;
};

type LimitFormProps = {
  title: string;
  url: string;
  values: {
    daily: {
      current: limitFormat;
      next?: limitFormat;
    };
    monthly: {
      current: limitFormat;
      next?: limitFormat;
    };
    weekly: {
      current: limitFormat;
      next?: limitFormat;
    };
  };
  type: LimitEnum;
  isUserDataLoading: boolean;
};

enum formFieldsEnum {
  WEEKLY = "weeklyLimit",
  DAILY = "dailyLimit",
  MONTHlY = "monthlyLimit",
}

type LimitNextValues = {
  daily: { limit: number | string | null; since: string };
  monthly: { limit: number | string | null; since: string };
  weekly: { limit: number | string | null; since: string };
};

const LimitForm: React.FC<LimitFormProps> = ({
  title,
  url,
  values,
  type,
  isUserDataLoading,
}) => {
  const { t } = useTranslation(["deposit-limits", "api-errors"]);
  const dispatch = useDispatch();
  const { triggerApi, data, error, isLoading, resetHookState } = useApi(
    `punters/${url}`,
    "POST",
  );
  const [formattedValues, setFormattedValues] = useState<{
    [key: string]: number;
  }>({
    daily: 0,
    monthly: 0,
    weekly: 0,
  });
  const [nextValues, setNextValues] = useState<LimitNextValues>({
    daily: { limit: null, since: "" },
    monthly: { limit: null, since: "" },
    weekly: { limit: null, since: "" },
  });
  const [inputMessages, setinputMessages] = useState<{ [key: string]: string }>(
    {
      daily: t("WILL_TAKE_EFFECT_IMMEDAITELY"),
      monthly: t("WILL_TAKE_EFFECT_IMMEDAITELY"),
      weekly: t("WILL_TAKE_EFFECT_IMMEDAITELY"),
    },
  );

  //need to handle in state as antd has an issue and form.getFieldError doesnt work
  const [areErrosVisible, setAreErrorsVisible] = useState<{
    [key: string]: boolean;
  }>({
    daily: false,
    monthly: false,
    weekly: false,
  });

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [onBlurDailyValue, setOnBlurDailyValue] = useState<number | string>("");
  const [onBlurWeeklyValue, setOnBlurWeeklyValue] = useState<number | string>(
    "",
  );
  const [onBlurMonthlyValue, setOnBlurMonthlyValue] = useState<number | string>(
    "",
  );

  const { getTimeWithTimezone } = useTimezone();

  useEffect(() => {
    if (data) {
      message.success(t("LIMITS_UPDATED"));
      dispatch(setUserLimits({ limits: data, type }));
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      error.payload?.errors.forEach(
        (error: { details: string; errorCode: string }) => {
          message.error(t(`api-errors:${error.errorCode}`));
        },
      );

      resetHookState();
    }
  }, [error]);

  const [form] = CoreForm.useForm();

  useEffect(() => {
    setFormattedValues({
      daily: values.daily?.current?.limit ? values.daily?.current?.limit : 0,
      monthly: values.monthly?.current?.limit
        ? values.monthly?.current?.limit
        : 0,
      weekly: values.weekly?.current?.limit ? values.weekly?.current?.limit : 0,
    });

    setNextValues({
      daily:
        values.daily?.next !== undefined
          ? values.daily.next
          : { limit: null, since: "" },
      monthly:
        values.monthly?.next !== undefined
          ? values.monthly.next
          : { limit: null, since: "" },
      weekly:
        values.weekly?.next !== undefined
          ? values.weekly.next
          : { limit: null, since: "" },
    });
  }, [values]);

  useEffect(() => {
    form.resetFields();
    setButtonState();
  }, [formattedValues]);

  const onFinish = (values: any) => {
    const { dailyLimit, monthlyLimit, weeklyLimit } = values;
    if (type === LimitEnum.SESSION) {
      triggerApi({
        daily: !dailyLimit
          ? null
          : { length: dailyLimit * 60, unit: LimitUnitEnum.MINUTES },
        weekly: !weeklyLimit
          ? null
          : { length: weeklyLimit * 60, unit: LimitUnitEnum.MINUTES },
        monthly: !monthlyLimit
          ? null
          : { length: monthlyLimit * 60, unit: LimitUnitEnum.MINUTES },
      });
      return;
    }
    triggerApi({
      daily: dailyLimit ? dailyLimit : null,
      weekly: weeklyLimit ? weeklyLimit : null,
      monthly: monthlyLimit ? monthlyLimit : null,
    });
  };

  const properDate = (limit: string) => {
    // TODO: get server timezone from server
    const serverTime = dayjs.tz(dayjs(), "America/Toronto");

    switch (limit) {
      case "daily":
        return getTimeWithTimezone(
          serverTime.add(1, "days").startOf("day"),
        ).format("lll");

      case "monthly":
        return getTimeWithTimezone(
          serverTime.add(1, "months").startOf("month"),
        ).format("lll");

      case "weekly":
        return getTimeWithTimezone(
          serverTime.add(1, "weeks").startOf("week"),
        ).format("lll");

      default:
        return getTimeWithTimezone(
          serverTime.add(1, "days").startOf("day"),
        ).format("lll");
    }
  };
  const generateInputMessage = (
    limit: "daily" | "monthly" | "weekly",
    startValue: number,
    currentValue: number,
  ) => {
    if (areErrosVisible[limit]) {
      setinputMessages((prev) => ({
        ...prev,
        [limit]: "",
      }));
      return;
    } else {
      if (startValue === 0 && currentValue > 0) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]: t("WILL_TAKE_EFFECT_IMMEDAITELY"),
        }));
        return;
      }

      if (startValue < currentValue) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]: t("WILL_TAKE_EFFECT_ON", {
            date: properDate(limit),
          }),
        }));
        return;
      }

      if (startValue === currentValue && type === LimitEnum.SESSION) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]:
            nextValues[limit].limit !== null
              ? t("WILL_CHANGE_TO_SESSION", {
                  value: `${nextValues[limit].limit}`,
                  since: getTimeWithTimezone(nextValues[limit].since).format(
                    "lll",
                  ),
                })
              : nextValues[limit].since !== ""
              ? t("LIMIT_WILL_BE_REMOVED_FROM", {
                  date: getTimeWithTimezone(nextValues[limit].since).format(
                    "lll",
                  ),
                })
              : "",
        }));
        return;
      }

      if (startValue === currentValue) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]:
            nextValues[limit].limit !== null
              ? t("WILL_CHANGE_TO", {
                  value: `$${nextValues[limit].limit}`,
                  since: getTimeWithTimezone(nextValues[limit].since).format(
                    "lll",
                  ),
                })
              : nextValues[limit].since !== ""
              ? t("LIMIT_WILL_BE_REMOVED_FROM", {
                  date: getTimeWithTimezone(nextValues[limit].since).format(
                    "lll",
                  ),
                })
              : "",
        }));
        return;
      }

      if (
        startValue > currentValue &&
        currentValue !== null &&
        currentValue !== 0
      ) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]: t("WILL_TAKE_EFFECT_IMMEDAITELY"),
        }));
        return;
      }

      if (startValue !== 0 && currentValue === 0) {
        setinputMessages((prev) => ({
          ...prev,
          [limit]: t("WILL_TAKE_EFFECT_ON", {
            date: properDate(limit),
          }),
        }));
        return;
      }
    }
  };

  const dailyLimit = form.getFieldValue(formFieldsEnum.DAILY);
  const monthlyLimit = form.getFieldValue(formFieldsEnum.MONTHlY);
  const weeklyLimit = form.getFieldValue(formFieldsEnum.WEEKLY);

  useEffect(() => {
    form.validateFields();
  }, [dailyLimit, monthlyLimit, weeklyLimit]);

  const setButtonState = () => {
    generateInputMessage("daily", formattedValues.daily, dailyLimit);
    generateInputMessage("monthly", formattedValues.monthly, monthlyLimit);
    generateInputMessage("weekly", formattedValues.weekly, weeklyLimit);
    setIsButtonDisabled(
      (formattedValues.daily === dailyLimit || dailyLimit === null) &&
        (formattedValues.monthly === monthlyLimit || monthlyLimit === null) &&
        (formattedValues.weekly === weeklyLimit || weeklyLimit === null),
    );
  };

  const onInputBlur = (limit: string, name: string) => {
    switch (name) {
      case formFieldsEnum.DAILY:
        setOnBlurDailyValue(limit);
        break;

      case formFieldsEnum.WEEKLY:
        setOnBlurWeeklyValue(limit);
        break;

      case formFieldsEnum.MONTHlY:
        setOnBlurMonthlyValue(limit);
        break;
    }
  };

  useEffect(() => {
    const isLimitContainsNumbers = /\d/.test(
      typeof onBlurDailyValue === "string"
        ? onBlurDailyValue
        : onBlurDailyValue.toString(),
    );
    if (!isLimitContainsNumbers) {
      form.setFieldsValue({
        dailyLimit: formattedValues.daily,
      });
      setOnBlurDailyValue(formattedValues.daily);
    }
  }, [onBlurDailyValue]);

  useEffect(() => {
    const isLimitContainsNumbers = /\d/.test(
      typeof onBlurWeeklyValue === "string"
        ? onBlurWeeklyValue
        : onBlurWeeklyValue.toString(),
    );
    if (!isLimitContainsNumbers) {
      form.setFieldsValue({
        weeklyLimit: formattedValues.weekly,
      });
      setOnBlurWeeklyValue(formattedValues.weekly);
    }
  }, [onBlurWeeklyValue]);

  useEffect(() => {
    const isLimitContainsNumbers = /\d/.test(
      typeof onBlurMonthlyValue === "string"
        ? onBlurMonthlyValue
        : onBlurMonthlyValue.toString(),
    );
    if (!isLimitContainsNumbers) {
      form.setFieldsValue({
        monthlyLimit: formattedValues.monthly,
      });
      setOnBlurMonthlyValue(formattedValues.monthly);
    }
  }, [onBlurMonthlyValue]);

  useEffect(() => {
    setButtonState();
    setIsButtonDisabled(!!Object.values(areErrosVisible).find((el) => el));
  }, [areErrosVisible]);

  const generateInputByType = (testId: string) => {
    if (type === LimitEnum.DEPOSIT || type === LimitEnum.STAKE) {
      return (
        <CoreInputNumber
          min={0}
          step={1}
          testId={testId}
          formatter={(value: any) =>
            `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          onChange={setButtonState}
          onBlur={(e) => () => onInputBlur(e.target.value, testId)}
        />
      );
    } else {
      return (
        <CoreInputNumber
          formatter={(value) =>
            `${value} hours`.replace(/(.+\s)(\hours)(.+)/, function(
              _,
              match1,
              match2,
              match3,
            ) {
              return (match1 + match3).replace(/\s/, "") + " " + match2;
            })
          }
          parser={(value: any) => value.replace(" hours", "")}
          min={0}
          step={1}
          testId={testId}
          onChange={setButtonState}
          onBlur={(e) => () => onInputBlur(e.target.value, testId)}
        />
      );
    }
  };

  return (
    <CoreSpin spinning={isUserDataLoading || isLoading}>
      <FormForLimts
        layout={"vertical"}
        name="passwordForm"
        form={form}
        initialValues={{
          dailyLimit: formattedValues.daily,
          monthlyLimit: formattedValues.monthly,
          weeklyLimit: formattedValues.weekly,
        }}
        onFinish={onFinish}
        onChange={setButtonState}
      >
        <CardWithBorderBottom bordered={false}>
          <Row gutter={[24, 0]}>
            <LimitsTitle span={24} data-testid="title">
              {t(title)}
            </LimitsTitle>
            <Col
              xxl={{ span: 6 }}
              xl={{ span: 8 }}
              md={{ span: 8 }}
              sm={{ span: 24 }}
              xs={{ span: 24 }}
            >
              <CoreForm.Item
                name={formFieldsEnum.DAILY}
                style={{ marginBottom: "0" }}
                label={t("DAILY_LOSS")}
                rules={[
                  { required: true, message: t("DAILY_ERROR") },
                  {
                    type: "integer",
                    message: t("ERROR_NUMBER_ONLY"),
                  },
                  type === LimitEnum.SESSION
                    ? ({}) => ({
                        validator(_rule, value) {
                          if (value <= 24) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            t("MAX_HOURS_ERROR", { value: 24 }),
                          );
                        },
                      })
                    : ({}) => ({
                        validator(_rule, _value) {
                          return Promise.resolve();
                        },
                      }),
                  ({}) => ({
                    validator(_rule, value) {
                      if (value && weeklyLimit && value > weeklyLimit) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          daily: true,
                        }));
                        return Promise.reject(t("DAILY_ERROR_2"));
                      }
                      if (
                        value &&
                        !weeklyLimit &&
                        monthlyLimit &&
                        value > monthlyLimit
                      ) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          daily: true,
                        }));
                        return Promise.reject(t("DAILY_ERROR_3"));
                      }
                      setAreErrorsVisible((prev) => ({
                        ...prev,
                        daily: false,
                      }));
                      return Promise.resolve();
                    },
                  }),
                ]}
                extra={inputMessages.daily}
              >
                {generateInputByType(formFieldsEnum.DAILY)}
              </CoreForm.Item>
            </Col>

            <Col
              xxl={{ span: 6 }}
              xl={{ span: 8 }}
              md={{ span: 8 }}
              sm={{ span: 24 }}
              xs={{ span: 24 }}
            >
              <CoreForm.Item
                label={t("WEEKLY_LOSS")}
                name={formFieldsEnum.WEEKLY}
                style={{ marginBottom: "0" }}
                rules={[
                  { required: true, message: t("WEEKLY_ERROR") },
                  {
                    type: "integer",
                    message: t("ERROR_NUMBER_ONLY"),
                  },
                  type === LimitEnum.SESSION
                    ? ({}) => ({
                        validator(_rule, value) {
                          if (value <= 168) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            t("MAX_HOURS_ERROR", { value: 168 }),
                          );
                        },
                      })
                    : ({}) => ({
                        validator(_rule, _value) {
                          return Promise.resolve();
                        },
                      }),
                  ({}) => ({
                    validator(_rule, value) {
                      if (value && dailyLimit && value < dailyLimit) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          weekly: true,
                        }));
                        return Promise.reject(t("WEEKLY_ERROR_2"));
                      }
                      if (value && monthlyLimit && value > monthlyLimit) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          weekly: true,
                        }));
                        return Promise.reject(t("WEEKLY_ERROR_3"));
                      }
                      setAreErrorsVisible((prev) => ({
                        ...prev,
                        weekly: false,
                      }));
                      return Promise.resolve();
                    },
                  }),
                ]}
                extra={inputMessages.weekly}
              >
                {generateInputByType(formFieldsEnum.WEEKLY)}
              </CoreForm.Item>
            </Col>

            <Col
              xxl={{ span: 6 }}
              xl={{ span: 8 }}
              md={{ span: 8 }}
              sm={{ span: 24 }}
              xs={{ span: 24 }}
            >
              <CoreForm.Item
                name={formFieldsEnum.MONTHlY}
                label={t("MONTHLY_LOSS")}
                style={{ marginBottom: "0" }}
                rules={[
                  { required: true, message: t("MONTHLY_ERROR") },
                  {
                    type: "integer",
                    message: t("ERROR_NUMBER_ONLY"),
                  },
                  type === LimitEnum.SESSION
                    ? ({}) => ({
                        validator(_rule, value) {
                          if (value <= 744) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            t("MAX_HOURS_ERROR", { value: 744 }),
                          );
                        },
                      })
                    : ({}) => ({
                        validator(_rule, _value) {
                          return Promise.resolve();
                        },
                      }),
                  ({}) => ({
                    validator(_rule, value) {
                      if (value && weeklyLimit && value < weeklyLimit) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          monthly: true,
                        }));
                        return Promise.reject(t("MONTHLY_ERROR_2"));
                      }
                      if (
                        value &&
                        !weeklyLimit &&
                        dailyLimit &&
                        value < dailyLimit
                      ) {
                        setAreErrorsVisible((prev) => ({
                          ...prev,
                          monthly: true,
                        }));
                        return Promise.reject(t("MONTHLY_ERROR_3"));
                      }
                      setAreErrorsVisible((prev) => ({
                        ...prev,
                        monthly: false,
                      }));
                      return Promise.resolve();
                    },
                  }),
                ]}
                extra={inputMessages.monthly}
              >
                {generateInputByType(formFieldsEnum.MONTHlY)}
              </CoreForm.Item>
            </Col>
          </Row>
          <RowMarginTop gutter={[24, 0]}>
            <Col
              xxl={{ span: 6 }}
              xl={{ span: 8 }}
              md={{ span: 8 }}
              sm={{ span: 24 }}
              xs={{ span: 24 }}
            >
              <SaveButton
                type="primary"
                testId={"saveButton"}
                htmlType="submit"
                size="large"
                loading={isLoading}
                disabled={isButtonDisabled}
              >
                {t("SAVE_LIMITS")}
              </SaveButton>
            </Col>
            <MessageContainer
              xxl={{ span: 18 }}
              xl={{ span: 16 }}
              md={{ span: 16 }}
              sm={{ span: 24 }}
            >
              {t("TO_REMOVE_LIMITS_MESSAGE")}
            </MessageContainer>
          </RowMarginTop>
        </CardWithBorderBottom>
      </FormForLimts>
    </CoreSpin>
  );
};

export { LimitForm };
