import styled from "styled-components";

export const PredictionSurface = styled.section`
  display: grid;
  gap: var(--space-4);
  padding: var(--space-2);

  @media (max-width: 767px) {
    padding: 0;
    gap: var(--space-3);
  }
`;

export const PredictionHero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.95fr);
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.14), transparent 24%),
    radial-gradient(circle at bottom right, rgba(0, 231, 0, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(33, 55, 67, 0.94), rgba(15, 31, 42, 0.98));
  box-shadow: var(--shadow-panel);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 767px) {
    padding: var(--space-3);
    border-radius: 18px;
  }
`;

export const PredictionHeroContent = styled.div`
  display: grid;
  gap: var(--space-3);
`;

export const PredictionHeroEyebrow = styled.span`
  color: rgba(255, 255, 255, 0.62);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const PredictionHeroTitle = styled.h1`
  margin: 0;
  color: #ffffff;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.04em;
`;

export const PredictionHeroCopy = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-md);
  line-height: 1.65;
  max-width: 60ch;
`;

export const PredictionHeroStatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

export const PredictionHeroStat = styled.div`
  min-width: 124px;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 4px;
`;

export const PredictionHeroStatLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PredictionHeroStatValue = styled.span`
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
`;

export const PredictionHeroSpotlight = styled.div`
  display: grid;
  gap: var(--space-3);
  align-content: start;
`;

export const PredictionHeroMarketCard = styled.button`
  width: 100%;
  text-align: left;
  padding: var(--space-4);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 18, 28, 0.92);
  color: #ffffff;
  cursor: pointer;
  transition: transform var(--duration-transition) var(--ease-standard),
    border-color var(--duration-transition) var(--ease-standard);

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.18);
  }
`;

export const PredictionSection = styled.section`
  display: grid;
  gap: var(--space-3);
`;

export const PredictionSectionHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

export const PredictionSectionTitleBlock = styled.div`
  display: grid;
  gap: 4px;
`;

export const PredictionSectionEyebrow = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PredictionSectionTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
`;

export const PredictionSectionCopy = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.55;
`;

export const PredictionFilterRow = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const PredictionFilterPill = styled.button<{ $active?: boolean }>`
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(255,255,255,0.24)" : "rgba(99, 120, 136, 0.22)"};
  background: ${(props) =>
    props.$active ? "rgba(255,255,255,0.08)" : "rgba(15, 31, 42, 0.72)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
`;

export const PredictionCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);

  @media (max-width: 1023px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionCategoryCard = styled.button<{ $accent: string }>`
  min-height: 146px;
  text-align: left;
  padding: var(--space-4);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(33, 55, 67, 0.9), rgba(15, 31, 42, 0.98));
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform var(--duration-transition) var(--ease-standard),
    border-color var(--duration-transition) var(--ease-standard);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    height: 3px;
    background: ${(props) => props.$accent};
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.16);
  }
`;

export const PredictionCategoryTitle = styled.h3`
  margin: 0 0 8px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
`;

export const PredictionCategoryCopy = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.6;
`;

export const PredictionMarketGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionMarketCard = styled.article`
  padding: var(--space-4);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 31, 42, 0.94);
  display: grid;
  gap: var(--space-3);
`;

export const PredictionMarketCardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
`;

export const PredictionBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

export const PredictionBadge = styled.span<{ $live?: boolean }>`
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  background: ${(props) => (props.$live ? "rgba(231, 51, 42, 0.18)" : "rgba(255,255,255,0.06)")};
  border: 1px solid ${(props) => (props.$live ? "rgba(231, 51, 42, 0.28)" : "rgba(255,255,255,0.08)")};
  color: #ffffff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const PredictionMarketTitleButton = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
  cursor: pointer;
`;

export const PredictionMarketSummary = styled.p`
  margin: 0;
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.6;
`;

export const PredictionMarketMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionMetaCard = styled.div`
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: grid;
  gap: 4px;
`;

export const PredictionMetaLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PredictionMetaValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 800;
`;

export const PredictionOutcomeRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
`;

export const PredictionOutcomeButton = styled.button<{ $active?: boolean }>`
  min-height: 58px;
  padding: var(--space-3);
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(0, 231, 0, 0.28)" : "rgba(255, 255, 255, 0.08)"};
  background: ${(props) =>
    props.$active ? "rgba(0, 231, 0, 0.12)" : "rgba(255, 255, 255, 0.04)"};
  color: #ffffff;
  display: grid;
  gap: 4px;
  text-align: left;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.14);
  }
`;

export const PredictionOutcomeLabel = styled.span`
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const PredictionOutcomePrice = styled.span`
  font-size: 18px;
  font-weight: 800;
`;

export const PredictionOutcomeChange = styled.span<{ $positive?: boolean }>`
  color: ${(props) => (props.$positive ? "var(--color-accent)" : "#ff7070")};
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const PredictionDetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: var(--space-4);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionDetailCard = styled.div`
  padding: var(--space-4);
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(15, 31, 42, 0.94);
  display: grid;
  gap: var(--space-3);
`;

export const PredictionRuleList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.7;
`;

export const PredictionEmptyState = styled.div`
  padding: 40px var(--space-4);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(15, 31, 42, 0.78);
  color: var(--color-neutral);
  text-align: center;
  font-size: var(--font-size-md);
  line-height: 1.6;
`;

export const PredictionActivityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionActivityCard = styled.article`
  padding: var(--space-4);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 31, 42, 0.94);
  display: grid;
  gap: var(--space-3);
`;

export const PredictionActivityHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
`;

export const PredictionActivityTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
`;

export const PredictionActivityMeta = styled.div`
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.6;
`;

export const PredictionActivityActions = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const PredictionInlineAction = styled.button`
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const PredictionSkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

export const PredictionSkeletonCard = styled.div`
  min-height: 280px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;
