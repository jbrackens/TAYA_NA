import * as React from "react";
import { IntlContext, IntlShape } from "react-intl";
import debounce from "lodash/debounce";
import styled, { useTheme } from "styled-components";
import Link from "next/link";
import cn from "classnames";
import { FormattedMessage } from "react-intl";
import { Brand, CMSDataLanguage, FooterLink } from "@brandserver-client/types";
import {
  ArrowFooter,
  ArrowDropDownIcon,
  MgaLogo,
  AgeLimit,
  GlobeIcon
} from "@brandserver-client/icons";
import { Breakpoints } from "@brandserver-client/ui";
import { useMessages, useScroll } from "@brandserver-client/hooks";
import { useRouter } from "next/router";
import { Dropdown, DropdownItem } from "./Dropdown";

export const StyledFooter = styled.footer`
  width: 100%;
  background-color: ${({ theme }) => theme.palette.primaryDark};
  padding: 0 26px;

  @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
    padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
    padding-left: 16px;
    padding-right: 16px;
  }

  &.footer__non-loggedin--lander {
    padding-bottom: 145px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding-bottom: max(200px, calc(200px + env(safe-area-inset-bottom)));
    }
  }

  &.footer__non-loggedin--game {
    padding-bottom: 0px;

    .footer__language-dropdown {
      z-index: 1000;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      padding-bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
    }
  }

  &.footer--game-grid {
    position: fixed;
    bottom: 0;
    z-index: 1004;
    opacity: 0;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      bottom: max(80px, calc(80px + env(safe-area-inset-bottom)));
      padding-bottom: 0px;
      overflow: hidden;
    }

    @media (orientation: landscape) and ${({ theme }) =>
        theme.breakpoints.down(Breakpoints.tablet)} {
      bottom: max(56px, calc(56px + env(safe-area-inset-bottom)));
      padding-bottom: 0px;
    }

    &.footer--game-grid__show {
      opacity: 1;
      transition: opacity 0.2s;
    }
  }

  .footer__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer__top-links {
    display: flex;
    height: 44px;
    align-items: center;
    flex-wrap: wrap;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      justify-content: space-between;
    }
  }

  .footer__link {
    cursor: pointer;
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.contrast};

    &:not(:last-child) {
      margin-right: 32px;
      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        margin-right: 5px;
      }
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      font-size: 10px;
      width: auto;
    }
  }

  .footer__top-icons {
    display: flex;
    align-items: center;
    justify-content: end;
    &:not(:last-child) {
      margin-right: 20px;
    }

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex: 1;
      justify-content: space-between;
    }
  }

  .footer__mga-image {
    width: 100px;
    height: 20px;
    margin-right: 10px;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 63px;
      height: 12px;
      margin-left: 10px;
      margin-right: 0px;
    }
  }

  .footer__top-arrow-icon {
    visibility: hidden;
    fill: ${({ theme }) => theme.palette.contrast};
    width: 20px;
    height: 20px;
    cursor: pointer;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      width: 14px;
      height: 14px;
    }

    &--visible {
      visibility: visible;
    }

    &--open {
      transform: rotate(-180deg);
      transition: transform 200ms ease;
    }

    &--close {
      transform: rotate(-360deg);
      transition: transform 200ms ease;
    }
  }

  .footer__bottom {
    display: none;
    padding-bottom: 20px;

    &--open {
      display: block;
    }
  }

  &.footer--game-grid {
    .footer__bottom--open {
      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        max-height: calc(100vh - 210px);
        overflow-y: scroll;
      }
    }
  }

  .footer_bottom__links-langs {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
    }
  }

  .footer__useful-info__header {
    display: none;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid ${({ theme }) => theme.palette.contrast};
    }
  }

  .footer__useful-info__text {
    ${({ theme }) => theme.typography.text16Bold};
    text-transform: uppercase;
    color: ${({ theme }) => theme.palette.accent};
  }

  .footer__useful-info__arrow {
    fill: ${({ theme }) => theme.palette.accent};
    width: 10px;
    height: 10px;

    &--open {
      transform: rotate(-180deg);
      transition: transform 200ms ease;
    }

    &--close {
      transform: rotate(-360deg);
      transition: transform 200ms ease;
    }
  }

  .footer__bottom-links {
    display: flex;
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      display: none;
      flex-direction: column;
      margin-top: 15px;

      &--open {
        display: flex;
      }
    }
  }

  .footer__language-dropdown {
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 16px;
    }
  }

  .footer__text {
    ${({ theme }) => theme.typography.text14};
    color: ${({ theme }) => theme.palette.secondary};

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      font-size: 10px;
    }

    a {
      color: ${({ theme }) => theme.palette.accent};
    }

    p {
      margin: 0 0 25px;

      @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
        margin-bottom: 14px;
      }

      &:last-child {
        margin: 0;
      }
    }
  }

  .footer__bottom-text-container {
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .policy-images {
    @media ${({ theme }) => theme.breakpoints.down(Breakpoints.tablet)} {
      margin-top: 22px;
    }
  }

  .footer__age-img {
    width: 35px;
    height: 35px;
  }
`;

interface Props {
  className?: string;
  languages?: CMSDataLanguage[];
  nonLoggedIn: boolean;
  navLinks: { primary: FooterLink[]; secondary: FooterLink[] };
}

const Footer: React.FC<Props> = ({
  navLinks,
  nonLoggedIn,
  languages
}: Props) => {
  const theme = useTheme();
  // TODO: fix type
  const brand = (theme as any).brand as Brand;
  const { asPath, pathname, query } = useRouter();

  const [activeLanguage, setActiveLanguage] = React.useState(
    query.lang as string
  );

  const intl = React.useContext(IntlContext as React.Context<IntlShape>);
  const isNonLoggedInLander =
    nonLoggedIn &&
    (asPath === `/${intl.locale}` || asPath === `/${intl.locale}/`);
  const isNonLoggedInGame = nonLoggedIn && pathname.includes("game");
  const isBetby = asPath.includes("sports");
  const isGameGrid =
    isBetby || asPath === "/loggedin" || asPath === `/${intl.locale}/games/all`;
  const [offset, setOffset] = React.useState(0);

  const [footerOpen, setFooterOpen] = React.useState(!isGameGrid);
  const [usefulInfoOpen, setUsefulInfoOpen] = React.useState(false);
  const messages = useMessages({
    footer: "footer.text",
    footerLinks: "footer.links",
    usefulInfo: "footer.useful-info",
    signUp: "register.sign-up",
    login: "login.login"
  });

  const updateOffset = debounce(() => {
    if (isGameGrid) {
      setOffset(window.pageYOffset);
    } else {
      setOffset(0);
    }
  }, 100);

  useScroll(updateOffset, [isGameGrid]);

  React.useEffect(() => setFooterOpen(!isGameGrid), [isGameGrid]);

  const handleUsefulInfoToggle = React.useCallback(() => {
    setUsefulInfoOpen(!usefulInfoOpen);
  }, [usefulInfoOpen]);

  const handleSelectLanguage = React.useCallback(
    (language: string) => {
      const newAsPath = `/${language}/${asPath.split("/").slice(2).join("/")}`;

      setActiveLanguage(language);
      window.location.replace(newAsPath);
    },
    [asPath]
  );

  return (
    <StyledFooter
      className={cn({
        "footer__non-loggedin--lander": isNonLoggedInLander,
        "footer__non-loggedin--game": isNonLoggedInGame,
        "footer--game-grid": isGameGrid,
        "footer--game-grid__show": offset > 100 || isBetby
      })}
    >
      <div className="footer__top">
        <div className="footer__top-links">
          {navLinks.primary.map(({ href, as, target, locale }: FooterLink) => (
            <Link href={href} as={as} key={as}>
              <a target={target} className="footer__link">
                <FormattedMessage id={locale} />
              </a>
            </Link>
          ))}
        </div>
        <div className="footer__top-icons">
          <a
            target="__blank"
            href="https://authorisation.mga.org.mt/verification.aspx?lang=EN&company=4be9bfaa-a54a-44fc-91d8-c69d7bb267ae&details=1"
          >
            <MgaLogo className="footer__mga-image" />
          </a>
          <ArrowFooter
            className={cn("footer__top-arrow-icon", {
              "footer__top-arrow-icon--visible": isGameGrid,
              "footer__top-arrow-icon--close": !footerOpen,
              "footer__top-arrow-icon--open": footerOpen
            })}
            onClick={() => setFooterOpen(!footerOpen)}
          />
        </div>
      </div>
      <div
        className={cn("footer__bottom", {
          "footer__bottom--open": footerOpen
        })}
      >
        <div className="footer_bottom__links-langs">
          <div className="footer__useful-info">
            <div
              className="footer__useful-info__header"
              onClick={handleUsefulInfoToggle}
            >
              <div className="footer__useful-info__text">
                {messages.usefulInfo}
              </div>
              <ArrowDropDownIcon
                className={cn("footer__useful-info__arrow", {
                  "footer__useful-info__arrow--open": usefulInfoOpen,
                  "footer__useful-info__arrow--close": !usefulInfoOpen
                })}
              />
            </div>
            <div
              className={cn("footer__bottom-links", {
                "footer__bottom-links--open": usefulInfoOpen
              })}
            >
              {navLinks.secondary.map(
                ({ href, as, target, locale }: FooterLink) => (
                  <Link href={href} as={as} key={as}>
                    <a target={target} className="footer__link">
                      <FormattedMessage id={locale} />
                    </a>
                  </Link>
                )
              )}
            </div>
          </div>
          {languages && languages.length > 0 ? (
            <Dropdown
              className="footer__language-dropdown"
              icon={<GlobeIcon />}
              value={activeLanguage}
              onChange={handleSelectLanguage}
            >
              {languages.map(language => (
                <DropdownItem key={language.code} value={language.code}>
                  {language.name}
                </DropdownItem>
              ))}
            </Dropdown>
          ) : null}
        </div>
        <div
          className="footer__text"
          dangerouslySetInnerHTML={{ __html: messages.footer }}
        />
        <div className="footer__bottom-text-container">
          <div
            className="footer__text"
            dangerouslySetInnerHTML={{ __html: messages.footerLinks }}
          />
          <div className="policy-images">
            {nonLoggedIn ? (
              <a href={`/${intl.locale}/pages/responsible_gaming`}>
                <AgeLimit className="footer__age-img" />
              </a>
            ) : (
              <Link
                href="/loggedin/pages?page=responsible_gaming"
                as="/loggedin/pages/responsible_gaming/"
              >
                <a>
                  <AgeLimit className="footer__age-img" />
                </a>
              </Link>
            )}
          </div>
        </div>
      </div>
    </StyledFooter>
  );
};

export { Footer };
export default Footer;
