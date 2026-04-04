import React from "react";
import { AggregationsContainer } from "../../rule-configuration-forms/aggregations/container";
import { defaultNamespaces } from "../defaults";

const Aggregations = () => {
  return <AggregationsContainer />;
};

Aggregations.namespacesRequired = [...defaultNamespaces];

export default Aggregations;
