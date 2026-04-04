import React from "react";
import SectionComponent from "../../shared/sectionComponent";
import OAuth2SocialList from "./list";
import ClientForm from "./form";
import Router from "next/router";
import { defaultNamespaces } from "../defaults";

const Oauth2Social = () => {
  const currentSocialId: string | string[] | undefined = Router.query?.id;
  return (
    <SectionComponent
      left={<OAuth2SocialList socialId={currentSocialId} />}
      right={currentSocialId && <ClientForm socialId={currentSocialId} />}
    />
  );
};

Oauth2Social.namespacesRequired = [...defaultNamespaces];

export default Oauth2Social;
