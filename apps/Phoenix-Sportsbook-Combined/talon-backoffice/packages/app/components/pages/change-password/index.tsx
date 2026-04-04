import Head from "next/head";
import { Col, Row } from "antd";
import { useTranslation } from "i18n";
import { ChangePasswordComponent } from "../../auth/change-password";
import { defaultNamespaces } from "../defaults";
import { StyledTitle } from "../account/index.styled";

function ChangePassword() {
  const { t } = useTranslation(ChangePassword.namespace);

  return (
    <>
      <Head>
        <title>{t("TITLE")}</title>
      </Head>
      <Row justify="center">
        <Col span={24}>
          <StyledTitle>{t("TITLE")}</StyledTitle>
        </Col>
        <Col span={24}>
          <ChangePasswordComponent />
        </Col>
      </Row>
    </>
  );
}

ChangePassword.namespace = "change-password";
ChangePassword.namespacesRequired = [
  ...defaultNamespaces,
  ChangePassword.namespace,
  "register",
];

export default ChangePassword;
