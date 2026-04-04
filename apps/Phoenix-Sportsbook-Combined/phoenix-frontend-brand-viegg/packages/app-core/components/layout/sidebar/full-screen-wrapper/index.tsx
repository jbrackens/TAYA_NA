import React, { useEffect, useMemo, useState } from "react";
import { Row, Divider, Col } from "antd";
import {
  FullScreenBetslipContainer,
  FullScreenLayout,
  FullScreenBetslipHeader,
  RowFullHeight,
  BetslipTrigger,
} from "./index.styled";
import { useTranslation } from "i18n";
import { CloseOutlined } from "@ant-design/icons";
import { Ticket } from "lucide-react";

type FullScreenWrapperProps = {
  isMobileFooterVisible: boolean;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  showTrigger?: boolean;
};

const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({
  children,
  isMobileFooterVisible,
  isOpen,
  setIsOpen,
  showTrigger = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [headerBetsCount, setHeaderBetsCount] = useState(0);
  const { t } = useTranslation("betslip");

  const isControlled = typeof isOpen === "boolean" && typeof setIsOpen === "function";
  const resolvedIsOpen = isControlled ? Boolean(isOpen) : internalOpen;
  const updateOpen = useMemo(
    () => (next: boolean) => {
      if (isControlled && setIsOpen) {
        setIsOpen(next);
        return;
      }
      setInternalOpen(next);
    },
    [isControlled, setIsOpen],
  );

  useEffect(() => {
    if (!headerBetsCount && resolvedIsOpen) {
      updateOpen(false);
    }
  }, [headerBetsCount, resolvedIsOpen, updateOpen]);

  const closeBetSlip = (e: React.MouseEvent) => {
    updateOpen(false);
    e.stopPropagation();
  };

  return (
    <>
      <FullScreenBetslipContainer
        $isCollapsed={resolvedIsOpen}
        $isVisible={headerBetsCount}
        $isMobileFooterVisible={isMobileFooterVisible}
        onClick={() => updateOpen(false)}
      >
        <FullScreenLayout
          $isCollapsed={resolvedIsOpen}
          onClick={(event) => event.stopPropagation()}
        >
          {resolvedIsOpen && (
            <Row>
              <FullScreenBetslipHeader span={24}>
                {t("BETSLIP")}
                <span
                  style={{
                    marginLeft: 8,
                    borderRadius: 999,
                    padding: "0 8px",
                    background: "var(--sb-bg-elevated)",
                    color: "var(--sb-text-primary)",
                    fontSize: 11,
                  }}
                >
                  {headerBetsCount}
                </span>
                <CloseOutlined onClick={() => updateOpen(false)} />
              </FullScreenBetslipHeader>
              <Divider style={{ margin: "0", borderColor: "var(--sb-border)" }} />
            </Row>
          )}

          <RowFullHeight $isCollapsed={resolvedIsOpen}>
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
      {showTrigger && headerBetsCount > 0 && !resolvedIsOpen ? (
        <BetslipTrigger type="button" onClick={() => updateOpen(true)}>
          <Ticket size={16} />
          {t("BETSLIP")}
          <span
            style={{
              borderRadius: 999,
              padding: "0 8px",
              background: "rgba(255, 255, 255, 0.2)",
              fontSize: 11,
            }}
          >
            {headerBetsCount}
          </span>
        </BetslipTrigger>
      ) : null}
    </>
  );
};

export { FullScreenWrapper };
