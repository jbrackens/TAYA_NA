import React from "react";
import { useTranslation } from "i18n";
import { CurrentBalanceComponent } from "../../current-balance";
import { Col, Row } from "antd";

const CashierTitleComponent: React.FC = () => {
  const { t } = useTranslation(["cashier"]);

  return (
    <Row justify="space-between">
      <Col>{t("CASHIER")}</Col>
      <Col>
        <CurrentBalanceComponent />
      </Col>
    </Row>
  );
};

export { CashierTitleComponent };
