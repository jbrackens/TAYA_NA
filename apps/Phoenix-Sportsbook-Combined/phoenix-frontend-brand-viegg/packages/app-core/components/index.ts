import App from "./app";
import { UpperFooterComponent } from "./layout/footer/upper-footer";
import { MainFooterComponent } from "./layout/footer/main-footer";
import { HeaderComponent as Header } from "./layout/header";
import { Layout } from "./layout";
import { SidebarComponent as Sidebar } from "./layout/sidebar";
import Pages from "./pages";
import { AppShell as SportsbookAppShell } from "./redesign/app-shell";
import { SportsbookAppShellPreview } from "./redesign/app-shell/preview";
import { SportsbookLayout } from "./redesign/sportsbook-layout";
import { PredictionLayout } from "./redesign/prediction-layout";

const components = {
  App,
  UpperFooterComponent,
  MainFooterComponent,
  Header,
  Layout,
  Sidebar,
  Pages,
  Redesign: {
    SportsbookAppShell,
    SportsbookAppShellPreview,
    SportsbookLayout,
    PredictionLayout,
  },
};

export default components;
