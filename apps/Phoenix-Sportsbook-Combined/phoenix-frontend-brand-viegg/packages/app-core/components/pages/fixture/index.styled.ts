import styled from "styled-components";

export const FixturePageSurface = styled.section`
  display: grid;
  gap: var(--space-4);
  padding: var(--space-2);

  @media (max-width: 767px) {
    padding: 0;
    gap: var(--space-3);
  }
`;

export const FixtureLoadingStack = styled.div`
  display: grid;
  gap: var(--space-4);
`;

export const FixtureLoadingHero = styled.div`
  min-height: 220px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.22);
  background: rgba(15, 31, 42, 0.94);

  @media (max-width: 767px) {
    border-radius: var(--radius-md);
    min-height: 180px;
  }
`;

export const FixtureLoadingGrid = styled.div`
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const FixtureLoadingCard = styled.div`
  min-height: 180px;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(15, 31, 42, 0.88);

  @media (max-width: 767px) {
    border-radius: var(--radius-md);
  }
`;

export const FixtureHero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.22);
  background:
    radial-gradient(circle at top right, rgba(0, 231, 0, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(33, 55, 67, 0.94), rgba(15, 31, 42, 0.96));
  box-shadow: var(--shadow-card);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 767px) {
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }
`;

export const FixtureHeroMain = styled.div`
  display: grid;
  gap: var(--space-3);
  align-content: start;
`;

export const FixtureBreadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const FixtureBackButton = styled.div`
  height: 32px;
  padding: 0 var(--space-3);
  border: 1px solid rgba(99, 120, 136, 0.24);
  border-radius: var(--radius-pill);
  background: rgba(15, 31, 42, 0.74);
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.72);
  }
`;

export const FixtureHeroEyebrow = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixtureHeroTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
`;

export const FixtureHeroIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 231, 0, 0.24);
  background: rgba(0, 231, 0, 0.12);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const FixtureHeroTitleBlock = styled.div`
  display: grid;
  gap: 6px;
`;

export const FixtureHeroTitle = styled.h1`
  margin: 0;
  color: #ffffff;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.03em;
`;

export const FixtureHeroSubtitle = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-base);
  line-height: 1.45;
  max-width: 58ch;
`;

export const FixturePillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

export const FixturePill = styled.div<{ $variant?: "live" | "warning" | "default" }>`
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: #ffffff;
  border: 1px solid
    ${(props) =>
      props.$variant === "live"
        ? "rgba(231, 51, 42, 0.28)"
        : props.$variant === "warning"
        ? "rgba(255, 184, 77, 0.3)"
        : "rgba(99, 120, 136, 0.24)"};
  background:
    ${(props) =>
      props.$variant === "live"
        ? "rgba(231, 51, 42, 0.12)"
        : props.$variant === "warning"
        ? "rgba(255, 184, 77, 0.12)"
        : "rgba(15, 31, 42, 0.72)"};
`;

export const FixtureHeroAside = styled.div`
  display: grid;
  gap: var(--space-3);
  align-content: start;
`;

export const FixtureTeamsBoard = styled.div`
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(15, 31, 42, 0.82);
`;

export const FixtureTeamRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 52px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
  background: rgba(33, 55, 67, 0.6);
`;

export const FixtureTeamName = styled.span`
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 700;
  line-height: 1.3;
`;

export const FixtureTeamScore = styled.span`
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  min-width: 28px;
  text-align: right;
`;

export const FixtureKickoffGrid = styled.div`
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

export const FixtureKickoffCard = styled.div`
  min-height: 78px;
  display: grid;
  gap: 6px;
  align-content: center;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(15, 31, 42, 0.74);
`;

export const FixtureKickoffLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixtureKickoffValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
`;

export const FixtureWarningBanner = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 184, 77, 0.28);
  background: rgba(255, 184, 77, 0.1);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const FixturePanelsGrid = styled.div`
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const FixturePanel = styled.section`
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.22);
  background: rgba(15, 31, 42, 0.94);
  box-shadow: var(--shadow-card);

  @media (max-width: 767px) {
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }
`;

export const FixturePanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

export const FixturePanelTitleGroup = styled.div`
  display: grid;
  gap: 4px;
`;

export const FixturePanelEyebrow = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixturePanelTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
`;

export const FixturePanelMeta = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const FixtureMetricsGrid = styled.div`
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const FixtureMetricCard = styled.div`
  display: grid;
  gap: 6px;
  min-height: 74px;
  align-content: center;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(33, 55, 67, 0.72);
`;

export const FixtureMetricLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixtureMetricValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 800;
  line-height: 1.3;
`;

export const FixtureTimeline = styled.div`
  display: grid;
  gap: var(--space-2);
`;

export const FixtureTimelineItem = styled.div`
  display: grid;
  gap: 6px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(33, 55, 67, 0.7);
`;

export const FixtureTimelineHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const FixtureTimelineTitle = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 800;
`;

export const FixtureTimelineTimestamp = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const FixturePanelEmpty = styled.div`
  min-height: 120px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  border: 1px dashed rgba(99, 120, 136, 0.22);
  background: rgba(33, 55, 67, 0.42);
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  font-weight: 700;
  text-align: center;
  padding: var(--space-3);
`;

export const FixtureTabsCard = styled.section`
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.22);
  background: rgba(15, 31, 42, 0.94);
  box-shadow: var(--shadow-card);

  @media (max-width: 767px) {
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }
`;

export const FixtureTabRail = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const FixtureTabButton = styled.button<{ $active?: boolean }>`
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--color-accent)" : "rgba(99, 120, 136, 0.22)"};
  background:
    ${(props) =>
      props.$active ? "var(--color-accent-muted)" : "rgba(33, 55, 67, 0.66)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.76);
  }
`;
