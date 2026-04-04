import * as React from "react";
import { Api } from ".";

const ApiContext = React.createContext<Api>(undefined as any as Api);
const { Provider } = ApiContext;

type ProviderProps = {
  api: Api;
  children: React.ReactNode;
};

const ApiProvider: React.FC<ProviderProps> = ({ api, children }) => (
  <Provider value={api}>{children}</Provider>
);

export { ApiContext, ApiProvider };
