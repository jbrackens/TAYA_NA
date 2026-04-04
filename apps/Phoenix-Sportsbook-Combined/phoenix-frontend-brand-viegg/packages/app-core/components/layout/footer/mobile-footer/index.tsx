import React, { useEffect } from "react";
import { Row, Col } from "antd";
import { useTranslation } from "i18n";
import { ButtonColumn, RowContainer } from "./index.styled";
import { useState } from "react";
import { useScrollDirection } from "@phoenix-ui/utils";
import { useRouter } from "next/router";
import { Clock3, Home, Ticket, User } from "lucide-react";

type MobileFooterComponentProps = {
  setIsMobileFooterVisible: (isVisible: boolean) => void;
};

const MobileFooterComponent: React.FC<MobileFooterComponentProps> = ({
  setIsMobileFooterVisible,
}) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const direction = useScrollDirection();
  useEffect(() => {
    if (direction === "SCROLL_UP") {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [direction]);

  useEffect(() => {
    setIsMobileFooterVisible(isVisible);
  }, [isVisible]);

  const { t } = useTranslation("footer");

  const navItems = [
    {
      id: "home",
      label: t("HOME"),
      icon: Home,
      href: "/sports/home",
    },
    {
      id: "in-play",
      label: t("IN_PLAY"),
      icon: Clock3,
      href: "/sports/in-play",
    },
    {
      id: "betslip",
      label: t("MY_BETS"),
      icon: Ticket,
      href: "/account/bet-history",
    },
    {
      id: "account",
      label: t("ACCOUNT"),
      icon: User,
      href: "/account",
    },
  ];

  return (
    <RowContainer $isVisible={isVisible}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isSelected = router.pathname.startsWith(item.href);
        return (
          <ButtonColumn
            key={item.id}
            span={6}
            $isSelected={isSelected}
            onClick={() => router.push(item.href)}
          >
            <Row>
              <Col span={24}>
                <Icon size={16} />
              </Col>
              <Col span={24}>{item.label}</Col>
            </Row>
          </ButtonColumn>
        );
      })}
    </RowContainer>
  );
};
export { MobileFooterComponent };
