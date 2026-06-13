import React from "react";
import { Divider } from "antd";
import { useTranslation } from "i18n";
import MarketCategoriesList from "../../components/market-categories/table";
import SportSelect from "../../components/market-categories/select";
import { Container } from "./index.styled";

const MarketCategoriesContainer = () => {
  const { t } = useTranslation("page-market-categories");

  return (
    <Container>
      <span>{t("SPORT")}</span>
      <SportSelect />
      <Divider />
      <span>{t("TABLE_TITLE")}</span>
      <MarketCategoriesList />
    </Container>
  );
};

export default MarketCategoriesContainer;
