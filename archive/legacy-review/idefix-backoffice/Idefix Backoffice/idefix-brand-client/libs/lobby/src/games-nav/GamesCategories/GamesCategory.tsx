import * as React from "react";
import cn from "classnames";
import styled from "styled-components";
import { useMessages } from "@brandserver-client/hooks";
import { Breakpoints } from "@brandserver-client/ui";
import { GamesCategory as GamesCategoryType } from "@brandserver-client/types";

interface Props {
  category: GamesCategoryType;
  isActiveCategory(tag: string): boolean;
  handleCategoryClick(tag: string): void;
}

const iconPaths = {
  all: {
    animation: "/icons/all_games_animation.svg",
    static: "/icons/all_games_static.svg"
  },
  jackpot: {
    animation: "/icons/jackpots_animation.svg",
    static: "/icons/jackpots_static.svg"
  },
  live: {
    animation: "/icons/live_animation.svg",
    static: "/icons/live_static.svg"
  },
  new: {
    animation: "/icons/new_games_animation.svg",
    static: "/icons/new_games_static.svg"
  },
  videoslot: {
    animation: "/icons/videoslot_animation.svg",
    static: "/icons/videoslot_static.svg"
  },
  tablegame: {
    animation: "/icons/tabletop_animation.svg",
    static: "/icons/tabletop_static.svg"
  },
  promo: {
    animation: "/icons/promo_animation.svg",
    static: "/icons/promo_static.svg"
  },
  sports: {
    animation: "/icons/promo_animation.svg",
    static: "/icons/promo_static.svg"
  }
};

const StyledGamesCategory = styled.li`
  &.nav-item {
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    padding-right: 10px;
    margin-right: 10px;
    cursor: pointer;
    text-transform: uppercase;
    border-radius: 5px;
    background-color: ${({ theme }) => theme.palette.contrast};
    ${({ theme }) => theme.typography.text16Bold};

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      margin-right: 15px;
      color: ${({ theme }) => theme.palette.primary};
    }

    &:not(.nav-item--active):hover {
      color: ${({ theme }) => theme.palette.contrast};
      background-color: ${({ theme }) => theme.palette.accentLight};
    }
  }

  &.nav-item--active {
    background-color: ${({ theme }) => theme.palette.accent};
    color: ${({ theme }) => theme.palette.contrast};

    &:hover {
      background-color: ${({ theme }) => theme.palette.accentDark};
    }
  }

  .nav-item__img-static,
  .nav-item__img-animation {
    width: 40px;
    height: 40px;
  }

  .nav-item__img-animation {
    display: none;
  }

  &:active,
  &.nav-item--active {
    .nav-item__img-animation {
      display: block;
    }
    .nav-item__img-static {
      display: none;
    }
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    &:hover {
      .nav-item__img-animation {
        display: block;
      }
      .nav-item__img-static {
        display: none;
      }
    }
  }

  .nav-item__icons-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .nav-item__cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 40px;
    height: 40px;
    z-index: 10;
  }
`;

const GamesCategory: React.FC<Props> = ({
  category,
  isActiveCategory,
  handleCategoryClick
}) => {
  const messages = useMessages({
    categoryLabel: `game.category.mobile.${category.name}`
  });

  return (
    <StyledGamesCategory
      key={category.tag}
      className={cn("nav-item", {
        "nav-item--active": isActiveCategory(category.tag)
      })}
      onClick={() => handleCategoryClick(category.tag)}
    >
      <div className="nav-item__icons-container">
        <div className="nav-item__cover" />
        <object
          data={iconPaths[category.tag].animation}
          type="image/svg+xml"
          className="nav-item__img-animation"
        />
        <object
          data={iconPaths[category.tag].static}
          type="image/svg+xml"
          className="nav-item__img-static"
        />
      </div>

      {messages.categoryLabel}
    </StyledGamesCategory>
  );
};

export default GamesCategory;
