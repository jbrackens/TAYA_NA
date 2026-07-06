import React, { useRef, useEffect, useState, useContext } from "react";
import { Col } from "antd";
import {
  MobileDivider,
  MainLink,
  SecondaryLink,
  DynamicCol,
  LogosCol,
  DynamicRow,
  UpperFooter,
  LogoContainer,
  DesktopSizeRow,
  DescContainer,
  DesktopLogoContainer,
  Desc,
  RowPadding,
  StyledLogoImage,
  PaymentMethodContainer,
  PaymentMethodImagesContainer,
} from "./index.styled";
import Link from "next/link";
import { useTranslation } from "i18n";
import { ThemeContext } from "styled-components";

const UpperFooterComponent: React.FC = () => {
  const { t } = useTranslation("footer");
  const descContainerRef = useRef<HTMLDivElement | null>(null);
  const [colHeight, setColHeight] = useState(0);
  const theme = useContext(ThemeContext);
  const isLogoVisible = theme.footer.shouldDisplayLogo;

  const logoImage = (
    <>{isLogoVisible && <StyledLogoImage src="/images/logo.svg" />}</>
  );

  useEffect(() => {
    if (descContainerRef.current?.clientHeight) {
      setColHeight(descContainerRef.current?.clientHeight);
    }
  }, [descContainerRef.current && descContainerRef.current.clientHeight]);

  return (
    <UpperFooter>
      <RowPadding>
        <Col xl={6} md={24} xs={24}>
          <DynamicRow>
            <DynamicCol xl={24} md={8} xs={8} $height={colHeight}>
              <MainLink>{t("COMPANY")}</MainLink>
              <SecondaryLink>
                <Link href="/about">About</Link>
              </SecondaryLink>
              <SecondaryLink>
                <Link href="/privacy-policy">{t("PRIVACY_POLICY")}</Link>
              </SecondaryLink>
              <SecondaryLink>
                <Link href="/terms-and-conditions">
                  {t("TERMS_AND_CONDITIONS")}
                </Link>
              </SecondaryLink>
            </DynamicCol>
            <DynamicCol xl={24} md={16} xs={16} $isForImage={true}>
              <LogoContainer>{logoImage}</LogoContainer>
            </DynamicCol>
          </DynamicRow>
          <MobileDivider />
        </Col>
        <DynamicCol xl={6} md={24} xs={24}>
          <MainLink>{t("HELP")}</MainLink>
          {/* <SecondaryLink>
            <Link href="/bonus-rules">{t("BONUS_RULES")}</Link>
          </SecondaryLink> */}
          <SecondaryLink>
            <Link href="/betting-rules">{t("BETTING_RULES")}</Link>
          </SecondaryLink>
          <SecondaryLink>
            <Link href="/responsible-gaming">{t("RESPONSIBLE_GAMING")}</Link>
          </SecondaryLink>
          {/* <SecondaryLink>
            <Link href="/promotions">{t("PROMOTIONS")}</Link>
          </SecondaryLink> */}
          <SecondaryLink>
            <Link href="/contact-us">{t("CONTACT_US")}</Link>
          </SecondaryLink>
        </DynamicCol>
        <MobileDivider />
        <DynamicCol xl={12} md={24}>
          <DescContainer ref={descContainerRef}>
            <DynamicCol span={24} $marginBottom={10}>
              <Desc>{t("DESC_1")}</Desc>
              <PaymentMethodContainer>
                <div>
                  {t("DEPOSIT")}
                  <span>
                    <img src="/images/arrow-left.svg" />
                  </span>
                </div>
                <div>{t("DEPOSIT_MESSAGE")}</div>
              </PaymentMethodContainer>
              <PaymentMethodContainer>
                <div>
                  {t("WITHDRAWALS")}
                  <span>
                    <img src="/images/arrow-right.svg" />
                  </span>
                </div>
                <div>{t("WITHDRAWAL_MESSAGE")}</div>
              </PaymentMethodContainer>
              <PaymentMethodImagesContainer>
                <span>
                  <img src="/images/Visa-card-flat.svg" />
                </span>
                <span>
                  <img src="/images/ballys_logo.svg" />
                </span>
              </PaymentMethodImagesContainer>
            </DynamicCol>
          </DescContainer>
        </DynamicCol>
      </RowPadding>
      <DesktopSizeRow style={{ marginBottom: "30px" }}>
        <LogosCol span={12}>
          <DesktopLogoContainer>{logoImage}</DesktopLogoContainer>
        </LogosCol>
      </DesktopSizeRow>
    </UpperFooter>
  );
};
export { UpperFooterComponent };
