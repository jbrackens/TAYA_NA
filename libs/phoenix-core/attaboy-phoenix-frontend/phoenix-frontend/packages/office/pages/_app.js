import App from "next/app";
import { appWithTranslation } from "i18n";
import AppComponent from "../components/app";

import store from "../store";

import "antd/dist/antd.css";
import { defaultMenuItems } from "../providers/menu/defaults";

const theme = {
  menu: "dark",
  menuDefaultColor: "#ffffff",
  logo: {
    source: "/images/logo.png",
    width: 60,
  },
};

function PhoenixApp(props) {
  return (
    <AppComponent
      {...props}
      store={store}
      theme={theme}
      menuItems={defaultMenuItems}
    />
  );
}

PhoenixApp.getInitialProps = async (appContext) => ({
  ...(await App.getInitialProps(appContext)),
});

export default appWithTranslation(PhoenixApp);
