import React from "react";

import { EventsContainer } from "../../rule-configuration-forms/events/container";
import { defaultNamespaces } from "../defaults";

const Events = () => {
  return <EventsContainer />;
};

Events.namespacesRequired = [...defaultNamespaces];

export default Events;
