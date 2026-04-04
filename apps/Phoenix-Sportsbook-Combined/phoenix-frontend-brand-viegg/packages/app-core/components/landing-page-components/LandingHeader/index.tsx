import { useState, useEffect } from "react";
import {
  HeaderContainer,
  IconDiv,
  RightSection,
  MobileMenuIcon,
  Wrapper,
  EsportsRedirectLink,
} from "../index.styled";
import { LandingPageButtonGroup } from "./../LandingPageButtonGroup";
import { ResponsibleGaming } from "../RespGambling";
import { MobileMenu } from "../MobileMenu";
import { LinkWrapper } from "../../linkWrapper";

interface LandingHeaderProps {
  hidden: boolean;
  fixed: boolean;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  hidden,
  fixed,
}: LandingHeaderProps) => {
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "auto";
  }, [mobileMenu]);

  return (
    <Wrapper $display={hidden} $fixedHeader={fixed}>
      <HeaderContainer>
        <IconDiv src="https://cdn.vie.gg/phoenix/static/landing-page/vielogo.svg" />
        <LinkWrapper href={"/sports/home"}>
          <EsportsRedirectLink>Sportsbook</EsportsRedirectLink>
        </LinkWrapper>
        <RightSection>
          <ResponsibleGaming />
          <LandingPageButtonGroup />
        </RightSection>
        <MobileMenuIcon>
          <button onClick={() => setMobileMenu(!mobileMenu)}>
            <img src="/images/menu.svg" />
          </button>
        </MobileMenuIcon>
        <MobileMenu display={mobileMenu} onClose={() => setMobileMenu(false)} />
      </HeaderContainer>
    </Wrapper>
  );
};
