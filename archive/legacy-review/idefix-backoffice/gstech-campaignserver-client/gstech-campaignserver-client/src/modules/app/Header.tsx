import * as React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Link, useHistory, useLocation, NavLink, useParams } from "react-router-dom";

import {
  selectBannerLocationsByBrand,
  selectBrands,
  selectSettingsIsLoading,
  selectTitleByBrand
} from "./settingsSlice";
import { Dropdown, Popup, MenuItem } from "../../components";
import { Logo } from "../../icons";
import { RootState } from "../../redux";
import { GoogleUser } from "../google-auth";

const StyledHeader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 64px;
  width: 100%;
  background: ${({ theme }) => theme.palette.white};
  border-bottom: 1px solid ${({ theme }) => theme.palette.blackLight};
  z-index: ${({ theme }) => theme.zIndex.header};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  .header__container {
    display: flex;
    justify-content: space-between;
    max-width: 1440px;
    width: 100%;
    padding: 16px;
  }

  .header__wrapper {
    display: flex;
    width: 100%;
  }

  .header__brand-selector {
    margin-left: 8px;
  }

  .nav {
    display: flex;
    align-items: center;
    margin-left: 16px;

    &-list {
      display: flex;

      &__item {
        display: flex;
        & > * {
          color: ${({ theme }) => theme.palette.blackDark};
          text-decoration: none;
        }

        .active {
          color: ${({ theme }) => theme.palette.blue};
        }
        &:not(:first-child) {
          margin-left: 16px;
        }
      }
    }
  }
`;

interface Params {
  brandId: string;
}

const Header = () => {
  const settingsIsLoading = useSelector(selectSettingsIsLoading);
  const brands = useSelector(selectBrands);
  const { brandId } = useParams<Params>();
  const { pathname } = useLocation();
  const { push } = useHistory();

  const brandTitle = useSelector((state: RootState) => selectTitleByBrand(state, brandId));
  const locationTabs = useSelector((state: RootState) => selectBannerLocationsByBrand(state, brandId));

  const title = settingsIsLoading ? "Loading..." : brandTitle;

  const handleChangeBrand = React.useCallback(
    newBrand => {
      if (pathname.includes("/rewards")) {
        push(`/${newBrand}/rewards`);
      }

      if (pathname.includes("/campaigns")) {
        push(`/${newBrand}/campaigns`);
      }

      if (pathname.includes("/games")) {
        push(`/${newBrand}/games`);
      }

      if (pathname.includes("/content")) {
        push(`/${newBrand}/content/email`);
      }

      if (pathname.includes("/landings")) {
        push(`/${newBrand}/landings`);
      }

      if (pathname.includes("/banners")) {
        push(`/${newBrand}/banners/${locationTabs ? locationTabs[0] : "frontpage"}`);
      }

      if (pathname.includes("/tournaments")) {
        push(`/${newBrand}/tournaments`);
      }

      if (pathname.includes("/localizations")) {
        push(`/${newBrand}/localizations`);
      }
    },
    [locationTabs, pathname, push]
  );

  return (
    <StyledHeader>
      <div className="header__container">
        <div className="header__wrapper">
          <Link to={`/${brandId}/campaigns`}>
            <Logo />
          </Link>
          <div className="header__brand-selector">
            <Dropdown title={title} appearance="flat">
              <Popup>
                {brands.map(({ id, name }) => (
                  <MenuItem
                    key={id}
                    value={id}
                    onClick={handleChangeBrand}
                    disabled={id === brandId?.toUpperCase()}
                    pathToImg={`/images/logos/${id}.png`}
                  >
                    {name}
                  </MenuItem>
                ))}
              </Popup>
            </Dropdown>
          </div>
          <nav className="nav">
            <ul className="nav-list">
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/campaigns`}>
                  Campaigns
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/rewards`}>
                  Rewards
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/games`}>
                  Games
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink
                  className="text-main-reg"
                  to={`/${brandId}/content/email`}
                  isActive={(_, location) => location.pathname.includes("/content")}
                >
                  Content
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/landings`}>
                  Landing Pages
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink
                  className="text-main-reg"
                  to={`/${brandId}/banners/${locationTabs ? locationTabs[0] : "frontpage"}`}
                  isActive={(_, location) => location.pathname.includes("/banners")}
                >
                  Banners
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/tournaments`}>
                  Tournaments
                </NavLink>
              </li>
              <li className="nav-list__item">
                <NavLink className="text-main-reg" to={`/${brandId}/localizations`}>
                  Localizations
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
        <GoogleUser />
      </div>
    </StyledHeader>
  );
};

export { Header };
