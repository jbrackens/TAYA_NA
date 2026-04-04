import React, { useState } from "react";
import { Row, Divider, Col } from "antd";
import {
  FullScreenBetslipContainer,
  FullScreenLayout,
  FullScreenBetslipHeader,
  RowFullHeight,
} from "./index.styled";
import { useTranslation } from "i18n";
import { UpOutlined } from "@ant-design/icons";
import { StyledBadge } from "../../../../components/layout/betslip/tabs/index.styled";

type FullScreenWrapperProps = {
  isMobileFooterVisible: boolean;
  children?: React.ReactNode;
};

const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({
  children,
  isMobileFooterVisible,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [headerBetsCount, setHeaderBetsCount] = useState(0);
  const { t } = useTranslation("betslip");

  const closeBetSlip = (e: React.MouseEvent) => {
    setIsCollapsed(false);
    e.stopPropagation();
  };

  return (
    <FullScreenBetslipContainer
      $isCollapsed={isCollapsed}
      $isVisible={headerBetsCount}
      $isMobileFooterVisible={isMobileFooterVisible}
    >
      <FullScreenLayout $isCollapsed={isCollapsed}>
        {!isCollapsed && (
          <Row>
            <FullScreenBetslipHeader
              span={24}
              onClick={() => setIsCollapsed(true)}
            >
              {t("BETSLIP")} <StyledBadge count={headerBetsCount} />
              <UpOutlined />
            </FullScreenBetslipHeader>
            <Divider style={{ margin: "0" }} />
          </Row>
        )}

        <RowFullHeight $isCollapsed={isCollapsed}>
          <Col span={24}>
            {children !== undefined &&
              React.cloneElement(children as any, {
                setHeaderBetsCount: setHeaderBetsCount,
                closeBetSlip: closeBetSlip,
              })}
          </Col>
        </RowFullHeight>
      </FullScreenLayout>
    </FullScreenBetslipContainer>
  );
};

export { FullScreenWrapper };
