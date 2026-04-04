import React from "react";

import { EventsContainer } from "../../rule-configuration-forms/test-events/container";
import { defaultNamespaces } from "../defaults";

const TestEvents = () => {
  return <EventsContainer />;
};

TestEvents.namespacesRequired = [...defaultNamespaces];

export default TestEvents;
