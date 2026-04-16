import React from "react";
import { AppShell, BottomNavItem } from "./index";
import {
  EventBoard,
  EventRow,
  NavItemPlaceholder,
  NavPlaceholder,
  OddsPlaceholder,
  OddsPlaceholderRow,
  PlaceholderBlock,
  PlaceholderStack,
  ShellBrand,
  ShellBrandMark,
  ShellCard,
  ShellCardBody,
  ShellCardHeader,
  ShellCardTitle,
  ShellMuted,
  ShellPill,
  ShellPillRow,
} from "./index.styled";

const LeftRailPlaceholder = () => (
  <PlaceholderStack>
    <ShellBrand>
      <ShellBrandMark />
      <div>
        <div>Attaboy</div>
        <ShellMuted>Sportsbook</ShellMuted>
      </div>
    </ShellBrand>
    <NavPlaceholder>
      <NavItemPlaceholder $active />
      <NavItemPlaceholder />
      <NavItemPlaceholder />
      <NavItemPlaceholder />
      <NavItemPlaceholder />
      <NavItemPlaceholder />
    </NavPlaceholder>
  </PlaceholderStack>
);

const CenterPlaceholder = () => (
  <PlaceholderStack>
    <ShellCard>
      <ShellCardHeader>
        <div>
          <ShellCardTitle>Featured Now</ShellCardTitle>
          <ShellMuted>Benchmark shell preview only</ShellMuted>
        </div>
        <ShellPillRow>
          <ShellPill $active>All</ShellPill>
          <ShellPill>Live</ShellPill>
          <ShellPill>Popular</ShellPill>
          <ShellPill>Today</ShellPill>
        </ShellPillRow>
      </ShellCardHeader>
      <ShellCardBody>
        <PlaceholderStack>
          <PlaceholderBlock $height="112px" />
          <EventBoard>
            {Array.from({ length: 6 }).map((_, index) => (
              <EventRow key={`event-row-${index}`}>
                <PlaceholderStack>
                  <PlaceholderBlock $height="10px" />
                  <PlaceholderBlock $height="10px" />
                </PlaceholderStack>
                <PlaceholderStack>
                  <PlaceholderBlock $height="12px" />
                  <PlaceholderBlock $height="12px" />
                </PlaceholderStack>
                <OddsPlaceholderRow>
                  <OddsPlaceholder />
                  <OddsPlaceholder />
                  <OddsPlaceholder />
                </OddsPlaceholderRow>
                <OddsPlaceholder />
              </EventRow>
            ))}
          </EventBoard>
        </PlaceholderStack>
      </ShellCardBody>
    </ShellCard>
  </PlaceholderStack>
);

const RightRailPlaceholder = () => (
  <PlaceholderStack>
    <ShellCard>
      <ShellCardHeader>
        <ShellCardTitle>Action Panel</ShellCardTitle>
        <ShellMuted>Sticky desktop rail</ShellMuted>
      </ShellCardHeader>
      <ShellCardBody>
        <PlaceholderStack>
          <PlaceholderBlock $height="52px" />
          <PlaceholderBlock $height="52px" />
          <PlaceholderBlock $height="52px" />
          <PlaceholderBlock $height="44px" />
          <PlaceholderBlock $height="48px" />
        </PlaceholderStack>
      </ShellCardBody>
    </ShellCard>
  </PlaceholderStack>
);

export const SportsbookAppShellPreview: React.FC = () => {
  return (
    <AppShell
      topBarLeft={
        <ShellBrand>
          <ShellBrandMark />
          <div>Attaboy Sports</div>
        </ShellBrand>
      }
      topBarCenter={
        <ShellPillRow>
          <ShellPill $active>Sports</ShellPill>
          <ShellPill>Live</ShellPill>
          <ShellPill>Promos</ShellPill>
          <ShellPill>My Bets</ShellPill>
        </ShellPillRow>
      }
      topBarRight={<PlaceholderBlock $height="40px" />}
      leftRail={<LeftRailPlaceholder />}
      centerContent={<CenterPlaceholder />}
      rightRail={<RightRailPlaceholder />}
      mobileActionBar={
        <>
          <div>
            <ShellCardTitle>0 Selections</ShellCardTitle>
            <ShellMuted>Bottom-sheet action bar placeholder</ShellMuted>
          </div>
          <ShellPill $active>Open</ShellPill>
        </>
      }
      bottomNav={
        <>
          <BottomNavItem $active>Home</BottomNavItem>
          <BottomNavItem>Live</BottomNavItem>
          <BottomNavItem>Search</BottomNavItem>
          <BottomNavItem>Bets</BottomNavItem>
          <BottomNavItem>Account</BottomNavItem>
        </>
      }
    />
  );
};
