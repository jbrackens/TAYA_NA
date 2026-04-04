import React, { useEffect, useState } from "react";
import { ListSiderComponent } from "../../../list-sider";
import { useApi } from "../../../../services/api-service";
import { useTranslation } from "next-export-i18n";
import { message } from "ui";

const OAuth2ClientsList = ({ clientUuid }) => {
  const { t } = useTranslation();
  const [listElements, setListElements] = useState([]);
  const getClients: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi("ipm/oauth2/clients", "GET");

  useEffect(() => {
    getClients.triggerApi();
  }, []);

  useEffect(() => {
    if (getClients.data) {
      setListElements(
        getClients.data.details.map((clientData) => ({
          title: clientData.clientId,
          id: clientData.clientUuid,
          variant: "none",
        })),
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
      elementUrl="/oauth2/clients/"
      addUrl="/oauth2/clients/add"
      selectedId={clientUuid}
      hideSearchSection
      loading={getClients.isLoading}
    />
  );
};

export default OAuth2ClientsList;
