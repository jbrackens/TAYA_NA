import { IntegrationMode } from "../../../lib/integration-mode";
import {
  parseConfigList,
  resolveConfigList,
} from "../../../lib/module-config-parser";

export type LandingWidgetId =
  | "about_vie"
  | "features_and_modes"
  | "esports_offering"
  | "about_eeg";

export type LandingWidgetSection = {
  backColor: string;
  nextSectionColor: string;
  heading: string;
  subHeading: string;
  content: string[];
  reverse: boolean;
  image: string;
  buttonStyle: "primary" | "secondary";
};

const LANDING_WIDGET_REGISTRY: Record<LandingWidgetId, LandingWidgetSection> = {
  about_vie: {
    backColor: "#dd2125",
    nextSectionColor: "#0f0f0f",
    heading: "VIE GO BEYOND THE BET",
    subHeading: "ABOUT VIE",
    content: [
      "Here at VIE we are obsessed with Esports, just like you.",
      "That’s why we made a one-of-a-kind Esports betting platform that was created with gamers in mind.",
      "We believe that betting should be safe and fair for Esports community. We believe in giving back and creating a healthy ecosystem where the players thrive.",
    ],
    reverse: false,
    image: "VIe-home-page-1-ok.png",
    buttonStyle: "secondary",
  },
  features_and_modes: {
    backColor: "#0f0f0f",
    nextSectionColor: "#18191a",
    heading: "FEATURES AND MODES",
    subHeading: "COMING SOON",
    content: [
      "There’s nothing like having a bet on your favorite team whilst watching them live. With VIE, you don’t have to take your eyes off the stream, ever. You can watch live Esports matches and wager as you go. No distractions.",
      "Take on the excitement of calling the next play as it happens, and get rewarded for your Esports knowledge on VIE.",
    ],
    reverse: true,
    image: "tablet.png",
    buttonStyle: "primary",
  },
  esports_offering: {
    backColor: "#18191a",
    nextSectionColor: "#dd2125",
    heading: "ALL ESPORTS,ALL THE TIME",
    subHeading: "ESPORTS OFFERING",
    content: [
      "With hundreds of matches taking place every day, you’ll always find something new on VIE. Whether you’re into clicking heads in CS:GO, destroying the Nexus in League of Legends, or taking Roshan in DOTA 2, we’ve got you covered.",
      "If it's esports, it's on VIE.",
    ],
    reverse: false,
    image: "vie-home-page-2-ok.png",
    buttonStyle: "primary",
  },
  about_eeg: {
    backColor: "#dd2125",
    nextSectionColor: "transparent",
    heading: "ESPORTS ENTERTAINMENT GROUP",
    subHeading: "ABOUT VIE",
    content: [
      "Esports Entertainment Group is a full-stack esports and online gambling company fueled by the growth of video-gaming and the ascendance of esports with new generations.",
      "Our mission is to help connect the world at large with the future of sports entertainment in unique and enriching ways that bring fans and gamers together.",
      "Esports Entertainment Group and its affiliates are well-poised to help fans stay connected and involved with their favorite esports. From traditional sports partnerships with professional NFL/NHL/NBA/FIFA teams, community-focused tournaments in a wide range of esports, iGaming and casinos, and boots-on-the-ground LAN cafes, EEG has influence over the full-spectrum of esports and gaming at all levels.",
    ],
    reverse: true,
    image: "Events-phone-vie-1-2.png",
    buttonStyle: "secondary",
  },
};

const MODE_DEFAULT_WIDGETS: Record<IntegrationMode, LandingWidgetId[]> = {
  [IntegrationMode.FULL]: [
    "about_vie",
    "features_and_modes",
    "esports_offering",
    "about_eeg",
  ],
  [IntegrationMode.MODULE]: ["about_vie", "features_and_modes"],
  [IntegrationMode.ODDS_FEED]: ["about_vie"],
};

const isLandingWidgetId = (value: string): value is LandingWidgetId =>
  value in LANDING_WIDGET_REGISTRY;

export const parseLandingWidgetList = (
  value?: string,
): LandingWidgetId[] => {
  return parseConfigList(value, isLandingWidgetId);
};

export const resolveLandingWidgets = (
  mode: IntegrationMode,
  widgetList?: string,
): LandingWidgetSection[] => {
  const orderedWidgetIds = resolveConfigList(
    mode,
    MODE_DEFAULT_WIDGETS,
    widgetList,
    isLandingWidgetId,
  );

  return orderedWidgetIds.map((widgetId) => LANDING_WIDGET_REGISTRY[widgetId]);
};
