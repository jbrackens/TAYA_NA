import styled from "styled-components";

export const NotEnoughMoneyErrorContainer = styled.div`
  width: 100%;
  color: var(--color-live);
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1.4;
`;

export const ListErrorContainer = styled.div`
  width: 100%;
  color: var(--color-live);
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1.4;
`;

export const SelectionCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

export const SelectionHeaderMeta = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`;

export const SelectionNameText = styled.span`
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 700;
  line-height: 1.2;
`;

export const MarketNameText = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const OddsClose = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export const SelectionOddsPill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  background: rgba(0, 231, 0, 0.1);
  border: 1px solid rgba(0, 231, 0, 0.22);
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  font-weight: 800;
`;

export const SelectionBody = styled.div`
  display: grid;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
`;

export const FixtureMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const FixtureNameText = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 600;
  line-height: 1.35;
`;

export const StakeAndReturnRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

export const PotentialReturnPanel = styled.div`
  min-width: 112px;
  display: grid;
  gap: 4px;
  justify-items: end;
`;

export const PotentialReturnLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PotentialReturnValue = styled.span`
  color: #d7bb62;
  font-size: var(--font-size-md);
  font-weight: 800;
`;

export const LoadingStatusText = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 600;
`;
