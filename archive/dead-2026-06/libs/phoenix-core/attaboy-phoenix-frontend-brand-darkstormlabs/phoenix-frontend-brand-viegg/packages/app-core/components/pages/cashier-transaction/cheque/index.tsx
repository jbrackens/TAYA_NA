import React from "react";
import { useTranslation } from "i18n";
import { StatusEnum, StyledResultComponent } from "../../../results";
import { defaultNamespaces } from "../../defaults";
import { Container } from "../index.styled";
import { CoreButton } from "../../../ui/button";

function CashierTransactionCheque() {
  const { t } = useTranslation(["cashier"]);
  return (
    <Container>
      <StyledResultComponent
        status={StatusEnum.WARNING}
        title={t("WITHDRAWAL_RESULT_TITLE")}
        subTitle={t("WITHDRAWAL_RESULT_SUBTITLE")}
        extra={[
          <CoreButton type="primary" href="/cashier?tab=Withdrawal" key="1">
            {t("WITHDRAWAL_AGAIN_BUTTON")}
          </CoreButton>,
        ]}
      />
    </Container>
  );
}

CashierTransactionCheque.namespacesRequired = [...defaultNamespaces, "cashier"];

export default CashierTransactionCheque;
