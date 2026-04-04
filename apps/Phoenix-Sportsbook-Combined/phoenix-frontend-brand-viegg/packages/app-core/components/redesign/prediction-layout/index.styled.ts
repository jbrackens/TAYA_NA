import styled from "styled-components";

export const PredictionTopNavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;

  @media (max-width: 1024px) {
    gap: var(--space-2);
  }
`;

export const PredictionTopNav = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  width: 100%;
`;

export const PredictionTopNavButton = styled.button<{ $active?: boolean }>`
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(255,255,255,0.36)" : "rgba(99, 120, 136, 0.24)"};
  background: ${(props) =>
    props.$active ? "rgba(255,255,255,0.08)" : "transparent"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);
  white-space: nowrap;

  &:hover {
    color: #ffffff;
    background: rgba(45, 74, 90, 0.45);
  }
`;

export const PredictionActionPanel = styled.div`
  height: 100%;
  display: grid;
  gap: var(--space-3);
  align-content: start;
`;

export const PredictionActionCard = styled.section`
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(33, 55, 67, 0.92), rgba(15, 31, 42, 0.96));
  overflow: hidden;
`;

export const PredictionActionCardHeader = styled.div`
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(99, 120, 136, 0.18);
  display: grid;
  gap: 4px;
`;

export const PredictionActionEyebrow = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const PredictionActionTitle = styled.h3`
  margin: 0;
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
`;

export const PredictionActionBody = styled.div`
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
`;

export const PredictionBalanceStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const PredictionSelectionTitle = styled.div`
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 700;
  line-height: 1.35;
`;

export const PredictionSelectionMeta = styled.div`
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.5;
`;

export const PredictionSelectionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0 10px;
  height: 28px;
  border-radius: var(--radius-pill);
  background: rgba(0, 231, 0, 0.12);
  border: 1px solid rgba(0, 231, 0, 0.24);
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const PredictionStakeInput = styled.input`
  width: 100%;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.26);
  background: rgba(15, 31, 42, 0.92);
  color: #ffffff;
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
  font-weight: 700;
  outline: none;

  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(0, 231, 0, 0.12);
  }
`;

export const PredictionStakeQuickRow = styled.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
`;

export const PredictionStakeQuickButton = styled.button`
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(99, 120, 136, 0.24);
  background: rgba(45, 74, 90, 0.28);
  color: #ffffff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    background: rgba(45, 74, 90, 0.48);
  }
`;

export const PredictionPreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
`;

export const PredictionPreviewCard = styled.div`
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: grid;
  gap: 4px;
`;

export const PredictionPreviewLabel = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const PredictionPreviewValue = styled.span<{ $positive?: boolean }>`
  color: ${(props) => (props.$positive ? "var(--color-accent)" : "#ffffff")};
  font-size: var(--font-size-md);
  font-weight: 800;
`;

export const PredictionActionButton = styled.button`
  width: 100%;
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #0f1f2a;
  font-size: var(--font-size-md);
  font-weight: 800;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    background: var(--color-accent-dim);
  }
`;

export const PredictionMutedCard = styled.div`
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
  line-height: 1.55;
`;

export const PredictionRail = styled.div`
  display: grid;
  gap: var(--space-4);
`;

export const PredictionRailSection = styled.section`
  display: grid;
  gap: var(--space-2);
`;

export const PredictionRailLabel = styled.div`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 var(--space-2);
`;

export const PredictionRailItem = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(255, 255, 255, 0.28)" : "rgba(99, 120, 136, 0.14)"};
  background: ${(props) =>
    props.$active ? "rgba(255, 255, 255, 0.08)" : "rgba(33, 55, 67, 0.2)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  display: flex;
  align-items: center;
  gap: var(--space-3);
  text-align: left;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    background: rgba(45, 74, 90, 0.42);
    color: #ffffff;
  }
`;

export const PredictionRailIcon = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
`;

export const PredictionBottomNavBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #0f1f2a;
  font-size: 10px;
  font-weight: 800;
`;

export const PredictionBottomNavItemContent = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
`;

export const PredictionMobileActionContent = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`;

export const PredictionMobileActionTitle = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 800;
`;

export const PredictionMobileActionMeta = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const PredictionMobileActionButton = styled.button`
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #ffffff;
  color: #0f1f2a;
  font-size: var(--font-size-sm);
  font-weight: 800;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    transform: scale(1.02);
  }
`;

export const PredictionTopBarBrand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 700;
`;

export const PredictionTopBarBrandMark = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(168, 194, 214, 0.72));
  box-shadow: var(--shadow-card);
`;
