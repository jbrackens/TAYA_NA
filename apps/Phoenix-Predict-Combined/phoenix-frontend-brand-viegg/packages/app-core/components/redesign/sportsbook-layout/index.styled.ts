import styled from "styled-components";

export const SportsbookTopNav = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  width: 100%;
`;

export const SportsbookTopNavGroup = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;

  @media (max-width: 1024px) {
    gap: var(--space-2);
  }
`;

export const SportsbookTopNavButton = styled.button<{ $active?: boolean }>`
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--color-accent)" : "rgba(99, 120, 136, 0.28)"};
  background: ${(props) =>
    props.$active ? "var(--color-accent-muted)" : "transparent"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);
  white-space: nowrap;

  &:hover {
    background: rgba(45, 74, 90, 0.45);
    color: #ffffff;
  }
`;

export const SportsbookTopActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  width: 100%;
`;

export const SportsbookActionButton = styled.button<{ $accent?: boolean }>`
  height: 38px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid
    ${(props) =>
      props.$accent ? "var(--color-accent)" : "rgba(99, 120, 136, 0.28)"};
  background: ${(props) =>
    props.$accent ? "var(--color-accent)" : "var(--color-bg-surface)"};
  color: ${(props) => (props.$accent ? "#0f1f2a" : "#ffffff")};
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);
  white-space: nowrap;

  &:hover {
    transform: scale(1.02);
    background: ${(props) =>
      props.$accent ? "var(--color-accent-dim)" : "var(--color-bg-elevated)"};
  }
`;

export const SportsbookBalancePill = styled.button`
  height: 38px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(99, 120, 136, 0.28);
  background: var(--color-bg-surface);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent);
  }
`;

export const SportsbookRail = styled.div`
  display: grid;
  gap: var(--space-4);
`;

export const SportsbookRailSection = styled.section`
  display: grid;
  gap: var(--space-2);
`;

export const SportsbookRailLabel = styled.div`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 var(--space-2);
`;

export const SportsbookRailItem = styled.button<{ $active?: boolean }>`
  min-height: 42px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(0, 231, 0, 0.35)" : "rgba(99, 120, 136, 0.14)"};
  background: ${(props) =>
    props.$active ? "rgba(0, 231, 0, 0.08)" : "rgba(33, 55, 67, 0.2)"};
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

export const SportsbookRailIcon = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
`;

export const SportsbookCenterStack = styled.div`
  display: grid;
  gap: var(--space-4);
`;

export const SportsbookStatusSlot = styled.div`
  min-height: 44px;

  @media (max-width: 768px) {
    min-height: 0;
  }
`;

export const SportsbookContentCard = styled.div`
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  background: rgba(33, 55, 67, 0.26);
  padding: var(--space-2);
`;

export const SportsbookRightRailFrame = styled.div`
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(99, 120, 136, 0.22);
  border-radius: var(--radius-lg);
  background: rgba(15, 31, 42, 0.96);
`;

export const SportsbookTopBarBrand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 700;
`;

export const SportsbookTopBarBrandMark = styled.div`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  box-shadow: var(--shadow-card);
`;


export const SportsbookMobileActionContent = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`;

export const SportsbookMobileActionTitle = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 800;
`;

export const SportsbookMobileActionMeta = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-xs);
  font-weight: 700;
`;

export const SportsbookMobileActionButton = styled.button`
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #0f1f2a;
  font-size: var(--font-size-sm);
  font-weight: 800;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    background: var(--color-accent-dim);
  }
`;

export const SportsbookBottomNavItemContent = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
`;

export const SportsbookBottomNavBadge = styled.span`
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
  background: var(--color-accent);
  color: #0f1f2a;
  font-size: 10px;
  font-weight: 800;
`;
