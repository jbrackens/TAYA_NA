import React, { useEffect, useState } from "react";
import { ListSiderComponent } from "../../../list-sider";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { message } from "ui";

const CurrencyList = ({ currencyId }) => {
  const { t } = useTranslation();
  const [listElements, setListElements] = useState([]);
  const getCurrency: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("wallet/admin/currencies", "GET");

  useEffect(() => {
    getCurrency.triggerApi();
  }, []);

  useEffect(() => {
    if (!getCurrency.data) return;
    if (getCurrency.data?.status !== "ok") return;

    setListElements(
      getCurrency.data.details.map((eventData) => ({
        title: eventData.name,
        id: eventData.id,
        variant: "none",
      })),
    );
  }, [getCurrency.data]);

  useEffect(() => {
    if (getCurrency.error) return message.error(t("CURRENCY_FETCH_FAILED"));
  }, [getCurrency.error]);

  return (
    <ListSiderComponent
      title={t("ADD_CURRENCY")}
      list={listElements}
      elementUrl="/wallet/currencies/"
      addUrl="/wallet/currencies/add"
      selectedId={currencyId}
      hideSearchSection
      loading={getCurrency.isLoading}
    />
  );
};

export default CurrencyList;
