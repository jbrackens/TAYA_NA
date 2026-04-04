import * as React from "react";
import { Route, Redirect, Switch, RouteComponentProps } from "react-router-dom";

import { Logo } from "./icons";
import App from "./modules/app";
import CampaignsPage, { CampaignDetails, NewCampaign } from "./pages/Campaigns";
import RewardsPage from "./pages/Rewards";
import GamesPage from "./pages/Games";
import ContentPage, { ContentDetails, CreateContent } from "./pages/Content";
import LandingsPage, { LandingDetails, CreateLanding } from "./pages/Landings";
import BannersPage, { BannerDetails, CreateBanner } from "./pages/Banners";
import ServerErrorPage from "./pages/ServerError";
import NotFoundPage from "./pages/NotFound";
import TournamentsPage, { CreateTournament, TournamentDetails } from "./pages/Tournaments";
import LocalizationsPage, { CreateLocalization, LocalizationDetails } from "./pages/Localizations";
import { GoogleLoginPage } from "./modules/google-auth";

const Routes: React.FC = () => (
  <Switch>
    <Route exact path="/">
      <Redirect to="/LD/campaigns" />
    </Route>
    <Route exact path="/not-found" component={NotFoundPage} />
    <Route exact path="/server-error" component={ServerErrorPage} />
    <Route exact path="/login" render={() => <GoogleLoginPage logo={<Logo />} />} />
    <Route
      path={"/:brandId"}
      render={(props: RouteComponentProps) => {
        return (
          <App>
            <Switch>
              <Route exact path={`${props.match.path}/campaigns`} component={CampaignsPage} />
              <Route exact path={`${props.match.path}/campaigns/new`} component={NewCampaign} />
              <Route exact path={`${props.match.path}/campaigns/new/:groupId`} component={NewCampaign} />
              <Route
                exact
                path={[
                  `${props.match.path}/campaigns/:campaignId/edit`,
                  `${props.match.path}/campaigns/:campaignId/details`
                ]}
                component={CampaignDetails}
              />
              <Route exact path={`${props.match.path}/rewards`} component={RewardsPage} />
              <Route exact path={`${props.match.path}/games`} component={GamesPage} />
              <Route exact path={`${props.match.path}/content/:contentType`} component={ContentPage} />
              <Route exact path={`${props.match.path}/content/:contentType/new`} component={CreateContent} />
              <Route exact path={`${props.match.path}/content/:contentType/:contentId`} component={ContentDetails} />
              <Route exact path={`${props.match.path}/landings`} component={LandingsPage} />
              <Route exact path={`${props.match.path}/landings/new`} component={CreateLanding} />
              <Route exact path={`${props.match.path}/landings/:landingId`} component={LandingDetails} />
              <Route exact path={`${props.match.path}/banners/new`} component={CreateBanner} />
              <Route exact path={`${props.match.path}/banners/:location`} component={BannersPage} />
              <Route exact path={`${props.match.path}/banners/details/:bannerId`} component={BannerDetails} />
              <Route exact path={`${props.match.path}/tournaments`} component={TournamentsPage} />
              <Route exact path={`${props.match.path}/tournaments/new`} component={CreateTournament} />
              <Route exact path={`${props.match.path}/tournaments/:tournamentId`} component={TournamentDetails} />
              <Route exact path={`${props.match.path}/localizations`} component={LocalizationsPage} />
              <Route exact path={`${props.match.path}/localizations/new`} component={CreateLocalization} />
              <Route exact path={`${props.match.path}/localizations/:localizationId`} component={LocalizationDetails} />
            </Switch>
          </App>
        );
      }}
    />
    <Route path="*" component={NotFoundPage} />
  </Switch>
);

export default Routes;
