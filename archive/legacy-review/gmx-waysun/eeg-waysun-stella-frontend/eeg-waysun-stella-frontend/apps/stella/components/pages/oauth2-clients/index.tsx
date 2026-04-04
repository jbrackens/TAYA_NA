import React from "react";
import SectionComponent from "../../shared/sectionComponent";
import OAuth2ClientsList from "./list";
import ClientForm from "./form";
import Router from "next/router";
import { defaultNamespaces } from "../defaults";

const Oauth2Clients = () => {
  const currentClientUuid: string | string[] | undefined = Router.query?.id;
  const addMode = Router.pathname.includes("add");
  return (
    <SectionComponent
      left={<OAuth2ClientsList clientUuid={currentClientUuid} />}
      right={
        (currentClientUuid || addMode) && (
          <ClientForm addMode={addMode} clientUuid={currentClientUuid} />
        )
      }
    />
  );
};

Oauth2Clients.namespacesRequired = [...defaultNamespaces];

export default Oauth2Clients;
