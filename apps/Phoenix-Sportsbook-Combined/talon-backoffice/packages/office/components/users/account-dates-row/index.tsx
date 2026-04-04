import { FC } from "react";
import { useTimezone } from "@phoenix-ui/utils";
import { Col, Descriptions, Row } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "i18n";

type Props = {
  signUpDate?: string;
  verifiedAt?: string;
  lastSignIn?: string;
  acceptedAt?: string;
  version: number;
};

export const AccountDatesRow: FC<Props> = ({
  signUpDate,
  verifiedAt,
  lastSignIn,
  acceptedAt,
  version,
}) => {
  const { t } = useTranslation("page-users-details");
  const { getTimeWithTimezone } = useTimezone();

  return (
    <Row gutter={16} style={{ marginBottom: "20px" }}>
      <Col span={24}>
        <Descriptions
          size="small"
          column={{ xxl: 5, xl: 5, lg: 1, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item
            labelStyle={{ fontWeight: "bold" }}
            label={t("HEADER_CARD_DETAILS_SIGNED_UP")}
          >
            <span role="userSignUpTime">
              {signUpDate
                ? getTimeWithTimezone(dayjs(signUpDate)).format(
                    t("common:DATE_TIME_FORMAT"),
                  )
                : ""}
            </span>
          </Descriptions.Item>
          <Descriptions.Item
            labelStyle={{ fontWeight: "bold" }}
            label={t("HEADER_CARD_DETAILS_VERIFIED")}
          >
            <span role="verifiedAtTime">
              {verifiedAt
                ? getTimeWithTimezone(dayjs(verifiedAt)).format(
                    t("common:DATE_TIME_FORMAT"),
                  )
                : ""}
            </span>
          </Descriptions.Item>
          <Descriptions.Item
            labelStyle={{ fontWeight: "bold" }}
            label={t("HEADER_CARD_DETAILS_LAST_LOGIN")}
          >
            <span role="lastLogin">
              {lastSignIn
                ? getTimeWithTimezone(dayjs(lastSignIn)).format(
                    t("common:DATE_TIME_FORMAT"),
                  )
                : ""}
            </span>
          </Descriptions.Item>
          <Descriptions.Item
            labelStyle={{ fontWeight: "bold" }}
            label={t("HEADER_CARD_DETAILS_TERMS_ACCEPTED")}
          >
            {acceptedAt ? (
              <>
                <span role="termsAcceptanceTime">
                  {getTimeWithTimezone(dayjs(acceptedAt)).format(
                    t("common:DATE_TIME_FORMAT"),
                  )}{" "}
                  (version: {version})
                </span>
              </>
            ) : (
              ""
            )}
          </Descriptions.Item>
        </Descriptions>
      </Col>
    </Row>
  );
};
