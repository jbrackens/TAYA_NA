import React, { useEffect } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { ButtonColumn, RowContainer } from "./index.styled";
import { useState } from "react";
import { useScrollDirection } from "@phoenix-ui/utils";
const {
  SHOW_FOR_SUBMISSION,
} = require("next/config").default().publicRuntimeConfig;

type MobileFooterComponentProps = {
  setIsMobileFooterVisible: (isVisible: boolean) => void;
};

const MobileFooterComponent: React.FC<MobileFooterComponentProps> = ({
  setIsMobileFooterVisible,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const direction = useScrollDirection();
  useEffect(() => {
    if (direction === "SCROLL_UP" && Number(SHOW_FOR_SUBMISSION)) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [direction]);

  useEffect(() => {
    setIsMobileFooterVisible(isVisible);
  }, [isVisible]);

  const { t } = useTranslation("footer");

  return (
    <RowContainer $isVisible={isVisible}>
      <ButtonColumn span={6}>
        <Row>
          <Col span={24}>
            <img src="/images/pad.svg" />
          </Col>
          <Col span={24}>{t("HOME")}</Col>
        </Row>
      </ButtonColumn>
      <ButtonColumn span={6}>
        <Row>
          <Col span={24}>
            <img src="/images/inplay.svg" />
          </Col>
          <Col span={24}>{t("IN_PLAY")}</Col>
        </Row>
      </ButtonColumn>
      <ButtonColumn span={6}>
        <Row>
          <Col span={24}>
            <img src="/images/bets.svg" />
          </Col>
          <Col span={24}>{t("MY_BETS")}</Col>
        </Row>
      </ButtonColumn>
      <ButtonColumn span={6}>
        <Row>
          <Col span={24}>
            <img src="/images/account.svg" />
          </Col>
          <Col span={24}>{t("ACCOUNT")}</Col>
        </Row>
      </ButtonColumn>
    </RowContainer>
  );
};
export { MobileFooterComponent };
