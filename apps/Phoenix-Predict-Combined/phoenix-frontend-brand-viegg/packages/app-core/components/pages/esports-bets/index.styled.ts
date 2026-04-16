import styled from "styled-components";
import { SelectContainer } from "../../ui/form/index.styled";

export const SportsbookPageSurface = styled.section`
  display: grid;
  gap: var(--space-4);
  padding: var(--space-2);

  @media (max-width: 767px) {
    padding: 0;
    gap: var(--space-3);
  }
`;

export const SportsbookHero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.9fr);
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at top right, rgba(0, 231, 0, 0.08), transparent 36%),
    linear-gradient(180deg, rgba(33, 55, 67, 0.92), rgba(15, 31, 42, 0.94));
  box-shadow: var(--shadow-card);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 767px) {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    gap: var(--space-3);
  }
`;

export const SportsbookHeroMain = styled.div`
  display: grid;
  gap: var(--space-3);
`;

export const SportsbookHeroEyebrow = styled.div`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  @media (max-width: 767px) {
    display: none;
  }
`;

export const SportsbookHeroTitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
`;

export const SportsbookHeroIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: rgba(0, 231, 0, 0.12);
  border: 1px solid rgba(0, 231, 0, 0.24);
  flex-shrink: 0;
`;

export const SportsbookHeroTitleBlock = styled.div`
  display: grid;
  gap: 6px;
`;

export const SportsbookHeroTitle = styled.h1`
  margin: 0;
  color: #ffffff;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.03em;

  @media (max-width: 767px) {
    font-size: 18px;
  }
`;

export const SportsbookHeroSubtitle = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-base);
  line-height: 1.45;
  max-width: 56ch;

  @media (max-width: 767px) {
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }
`;

export const SportsbookPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

export const SportsbookPill = styled.div`
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
  border: 1px solid rgba(99, 120, 136, 0.26);
  background: rgba(15, 31, 42, 0.72);
`;

export const SportsbookLiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background: var(--color-live);
  box-shadow: 0 0 0 rgba(231, 51, 42, 0.5);
  animation: sportsbook-live-pulse 2s infinite;

  @keyframes sportsbook-live-pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(231, 51, 42, 0.45);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(231, 51, 42, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(231, 51, 42, 0);
    }
  }
`;

export const SportsbookHeroSide = styled.div`
  display: grid;
  gap: var(--space-3);
  align-content: start;
`;

export const SportsbookStatGrid = styled.div`
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1023px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
`;

export const SportsbookStatCard = styled.div`
  min-height: 82px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.2);
  background: rgba(15, 31, 42, 0.76);
  display: grid;
  gap: 6px;
  align-content: center;
`;

export const SportsbookStatLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const SportsbookStatValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: 1.1;
`;

export const SportsbookControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

export const SportsbookToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background: rgba(15, 31, 42, 0.78);
  border: 1px solid rgba(99, 120, 136, 0.2);
`;

export const SportsbookToggleButton = styled.button<{ $active?: boolean }>`
  min-width: 96px;
  height: 36px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-pill);
  background: ${(props) =>
    props.$active ? "var(--color-bg-elevated)" : "transparent"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.72);
  }
`;

export const SportsbookFilterGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const SportsbookFilterButton = styled.button<{ $active?: boolean }>`
  min-width: 72px;
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--color-accent)" : "rgba(99, 120, 136, 0.22)"};
  background: ${(props) =>
    props.$active ? "var(--color-accent-muted)" : "rgba(15, 31, 42, 0.72)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.72);
  }
`;

export const OddsFormatWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;

  @media (max-width: 767px) {
    margin-left: 0;
    width: 100%;
  }

  ${SelectContainer} {
    min-width: 160px;

    @media (max-width: 767px) {
      width: 100%;
      min-width: 0;
    }
  }
`;

export const OddsFormatLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixtureListContainer = styled.section`
  display: grid;
  gap: 0;
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: rgba(15, 31, 42, 0.94);
  box-shadow: var(--shadow-card);

  @media (max-width: 767px) {
    border-radius: var(--radius-md);
  }
`;


export const SportsbookQuickSwitchStack = styled.div`
  display: grid;
  gap: var(--space-3);
`;

export const SportsbookQuickSwitchSection = styled.div`
  display: grid;
  gap: var(--space-2);
`;

export const SportsbookQuickSwitchLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const SportsbookQuickSwitchRail = styled.div`
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const SportsbookQuickSwitchButton = styled.button<{ $active?: boolean }>`
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? 'var(--color-accent)' : 'rgba(99, 120, 136, 0.22)'};
  background: ${(props) =>
    props.$active ? 'var(--color-accent-muted)' : 'rgba(15, 31, 42, 0.72)'};
  color: ${(props) => (props.$active ? '#ffffff' : 'var(--color-neutral)')};
  font-size: var(--font-size-sm);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.72);
  }
`;
