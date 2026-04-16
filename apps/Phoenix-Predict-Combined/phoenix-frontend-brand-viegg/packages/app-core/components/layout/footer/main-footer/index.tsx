import React from "react";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { MainFooterContainer, IconContainer, ContentCol } from "./index.styled";
const {
  SHOW_FOR_SUBMISSION,
} = require("next/config").default().publicRuntimeConfig;

const MainFooterComponent: React.FC = () => {
  const { t } = useTranslation("footer");

  const copyrightYear = new Date().getFullYear();

  return (
    <MainFooterContainer style={{ textAlign: "center" }}>
      <Row>
        <ContentCol span={12}>
          {t("LOWER_FOOTER_CONTENT", { year: copyrightYear })}
        </ContentCol>
        <Col span={12}>
          {Number(SHOW_FOR_SUBMISSION) ? (
            <>
              <IconContainer>
                <img src="/images/fb.svg" />
              </IconContainer>
              <IconContainer>
                <img src="/images/twitter.svg" />
              </IconContainer>
              <IconContainer>
                <img src="/images/instagram.svg" />
              </IconContainer>
            </>
          ) : (
            <></>
          )}
        </Col>
      </Row>
    </MainFooterContainer>
  );
};
export { MainFooterComponent };
