import styled from "styled-components";

export const FixtureMarketsSurface = styled.section`
  display: grid;
  gap: var(--space-4);
`;

export const FixtureMarketsGrid = styled.div`
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1199px) {
    grid-template-columns: 1fr;
  }
`;

export const FixtureMarketSection = styled.section`
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

export const FixtureMarketSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
`;

export const FixtureMarketSectionTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
  letter-spacing: -0.02em;
`;

export const FixtureMarketSectionCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(99, 120, 136, 0.24);
  background: rgba(33, 55, 67, 0.82);
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const FixtureMarketList = styled.div`
  display: grid;
  gap: var(--space-3);
`;

export const FixtureMarketCard = styled.article`
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(33, 55, 67, 0.72);
  transition: background var(--duration-transition) var(--ease-standard);

  &:hover {
    background: rgba(45, 74, 90, 0.78);
  }
`;

export const FixtureMarketMeta = styled.div`
  display: grid;
  gap: 6px;
`;

export const FixtureMarketName = styled.h4`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-base);
  font-weight: 700;
  line-height: 1.3;
`;

export const FixtureMarketSpecifier = styled.div`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const FixtureMarketButtonGrid = styled.div<{ $columns?: number }>`
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(${(props) => Math.max(props.$columns || 2, 1)}, minmax(0, 1fr));

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const FixtureMarketEmptyState = styled.div`
  min-height: 160px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(99, 120, 136, 0.22);
  background: rgba(15, 31, 42, 0.56);
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  font-weight: 700;
`;
