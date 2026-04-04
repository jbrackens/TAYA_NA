import React from "react";
import SectionComponent from "./../../shared/sectionComponent";
import CurrencyList from "./list";
import CurrencyForm from "./form";
import { defaultNamespaces } from "../defaults";
import Router from "next/router";

const Currencies = () => {
  const currentCurrencyId: string | string[] | undefined = Router.query?.id;
  const addMode = Router.pathname.includes("add");

  return (
    <SectionComponent
      left={<CurrencyList currencyId={currentCurrencyId} />}
      right={
        (currentCurrencyId || addMode) && (
          <CurrencyForm addMode={addMode} currencyId={currentCurrencyId} />
        )
      }
    />
  );
};

Currencies.namespacesRequired = [...defaultNamespaces];

export default Currencies;
