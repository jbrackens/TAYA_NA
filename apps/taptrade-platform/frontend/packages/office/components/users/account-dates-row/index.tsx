import { FC } from "react";
import { useTimezone } from "@taptrade-ui/utils";
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
    <Row gutter={16} className="mb-5">
      <Col span={24}>
        <Descriptions
          size="small"
          column={{ xxl: 5, xl: 5, lg: 1, md: 1, sm: 1, xs: 1 }}
        >
          <Descriptions.Item
            label={
              <span className="font-bold">
                {t("HEADER_CARD_DETAILS_SIGNED_UP")}
              </span>
            }
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
            label={
              <span className="font-bold">
                {t("HEADER_CARD_DETAILS_VERIFIED")}
              </span>
            }
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
            label={
              <span className="font-bold">
                {t("HEADER_CARD_DETAILS_LAST_LOGIN")}
              </span>
            }
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
            label={
              <span className="font-bold">
                {t("HEADER_CARD_DETAILS_TERMS_ACCEPTED")}
              </span>
            }
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
