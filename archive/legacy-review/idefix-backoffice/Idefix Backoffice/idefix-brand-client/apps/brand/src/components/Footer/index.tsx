import React from "react";
import { getNonloggedinLinks, links } from "./content";
import { Footer } from "@brandserver-client/lobby";
import { CMSDataLanguage } from "@brandserver-client/types";

interface Props {
  nonLoggedIn?: boolean;
  language: string;
  languages?: CMSDataLanguage[];
}

const DesktopFooter = ({ nonLoggedIn, language, languages }: Props) => {
  const navLinks = nonLoggedIn ? getNonloggedinLinks(language) : links;

  return (
    <Footer
      navLinks={navLinks}
      languages={languages}
      nonLoggedIn={nonLoggedIn}
    />
  );
};

export default DesktopFooter;
