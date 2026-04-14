import { useEffect, useState } from "react";
import { defaultNamespaces } from "../defaults";
import { LandingHeader } from "../../landing-page-components/LandingHeader";
import { LandingSection } from "../../landing-page-components/LandingSection";
import { LoginComponent } from "./../../auth/login";
import { RegisterComponent } from "./../../auth/register";
import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "../../../lib/slices/authSlice";
import { useRouter } from "next/router";
import {
  LandingPageContainer,
  ContentWrapper,
  ScrollToTopButton,
} from "./index.styled";
import { ForgotPasswordComponent } from "../../auth/forgot-reset-password/forgot-password";
import { ResetPasswordComponent } from "../../auth/forgot-reset-password/reset-password";
import Head from "next/head";

// ***
// Provide the following details in the array below to correctly display the Landing Page Sections
// ***
//   backColor - Section background color
//   nextSectionColor - Next section background color so that the bottom style in the section is correctly rendered
//   heading - Big header text to be displayed
//   subHeading - sub header (above main header) text to be displayed
//   content - Array. Text to be displayed in the section body.
//   reverse - By default, the image column comes first, then the text column. Set this as true to display as opposite
//   image - the image to be displayed. Add the image in the assets folder and provide the image name with extension
//   buttonStyle - to display Primary or Secondary style button in the section
// ***

const landingPageContent = [
  {
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
  {
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
  {
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
  {
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
];

const AVOID_SCROLL_LIMIT = 600;

function LandingPage() {
  const [y, setY] = useState(0);
  const [scrollingUp, setScrollingUp] = useState(true);
  const [fixed, setFixed] = useState(false);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const router = useRouter();

  const handleNavigation = (e: Event) => {
    const window = e.currentTarget;
    setScrollingUp(
      y < AVOID_SCROLL_LIMIT ? true : y > window.scrollY ? true : false,
    );
    setFixed(y < AVOID_SCROLL_LIMIT ? false : true);
    setY(window.scrollY);
  };

  useEffect(() => {
    setY(window.scrollY);
    window.addEventListener("scroll", handleNavigation);
    return () => {
      window.removeEventListener("scroll", handleNavigation);
    };
  }, [handleNavigation]);

  useEffect(() => {
    isLoggedIn && router.push("/esports-bets");
  }, [isLoggedIn]);

  const domainName = typeof window !== "undefined" ? window.location.host : "";

  return (
    <>
      <LandingPageContainer>
        <Head>
          <link rel="canonical" href={`https:/${domainName}`} />
        </Head>
        <LandingHeader hidden={!scrollingUp} fixed={fixed} />
        <ContentWrapper>
          {landingPageContent.map((content, index) => (
            <LandingSection {...content} sectionNumber={index} key={index} />
          ))}
        </ContentWrapper>
        <ScrollToTopButton
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          $displayButton={fixed}
        >
          <img src="https://cdn.vie.gg/phoenix/static/landing-page/chevron_white.svg" />
        </ScrollToTopButton>
        <LoginComponent />
        <RegisterComponent />
        <ForgotPasswordComponent />
        <ResetPasswordComponent />
      </LandingPageContainer>
    </>
  );
}

LandingPage.namespacesRequired = [...defaultNamespaces];

export default LandingPage;
