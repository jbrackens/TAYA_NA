import React, { useEffect, useState } from "react";
import { ListSiderComponent } from "../../../list-sider";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { message } from "ui";

const OAuth2SocialList = ({ socialId }) => {
  const { t } = useTranslation();
  const [listElements, setListElements] = useState([]);
  const getClients: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/oauth2/social", "GET");

  useEffect(() => {
    getClients.triggerApi();
  }, []);

  useEffect(() => {
    if (getClients.data) {
      setListElements(
        getClients.data.details.map((clientData) => {
          return {
            title: clientData.socialId,
            id: clientData.socialId,
            variant: "none",
          };
        }),
      );
    }
  }, [getClients.data]);

  useEffect(() => {
    if (getClients.error) {
      message.error(t("OAUTH_FETCH_FAILED"));
      getClients.resetHookState();
    }
  }, [getClients.error]);

  return (
    <ListSiderComponent
      title={t("ADD_CLIENT")}
      list={listElements}
      elementUrl="/oauth2/social/"
      addUrl="/oauth2/social/add"
      selectedId={socialId}
      hideSearchSection
      hideAddSection
      loading={getClients.isLoading}
    />
  );
};

export default OAuth2SocialList;
