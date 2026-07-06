import styled from "styled-components";

export const ShellViewport = styled.div`
  min-height: 100vh;
  background: var(--color-bg-overlay);
  color: #ffffff;
`;

export const ShellTopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  height: 64px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 360px;
  align-items: center;
  border-bottom: 1px solid rgba(99, 120, 136, 0.28);
  background: rgba(15, 31, 42, 0.96);
  backdrop-filter: blur(10px);

  @media (max-width: 1024px) {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  @media (max-width: 768px) {
    height: 56px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 0 var(--space-3);
  }
`;

export const ShellTopBarSection = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-right: 1px solid rgba(99, 120, 136, 0.2);
  gap: var(--space-2);
  min-width: 0;

  &:last-child {
    border-right: 0;
  }

  @media (max-width: 1024px) {
    &:last-child {
      display: none;
    }
  }

  @media (max-width: 768px) {
    padding: 0;
    border-right: 0;

    &:nth-child(2) {
      display: none;
    }

    &:last-child {
      display: flex;
      justify-content: flex-end;
      padding-left: var(--space-2);
    }
  }
`;

export const ShellBrand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-lg);
  font-weight: 700;
`;

export const ShellBrandMark = styled.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  box-shadow: var(--shadow-card);
`;

export const ShellFrame = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 360px;
  min-height: calc(100vh - 64px);

  @media (max-width: 1024px) {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    min-height: calc(100vh - 56px);
    padding-bottom: 148px;
  }
`;

const shellColumn = `
  min-height: 100%;
  padding: var(--space-4);
`;

export const ShellLeftRail = styled.aside`
  ${shellColumn}
  background: var(--color-bg-overlay);
  border-right: 1px solid rgba(99, 120, 136, 0.22);

  @media (max-width: 768px) {
    display: none;
  }
`;

export const ShellCenter = styled.main`
  ${shellColumn}
  background: var(--color-bg-base);
  overflow: hidden;

  @media (max-width: 768px) {
    padding: var(--space-3);
  }
`;

export const ShellRightRail = styled.aside`
  ${shellColumn}
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  background: var(--color-bg-overlay);
  border-left: 1px solid rgba(99, 120, 136, 0.22);

  @media (max-width: 1024px) {
    display: none;
  }
`;

export const ShellCard = styled.section`
  border: 1px solid rgba(99, 120, 136, 0.28);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-card);
`;

export const ShellCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(99, 120, 136, 0.2);
`;

export const ShellCardTitle = styled.div`
  font-size: var(--font-size-lg);
  font-weight: 700;
`;

export const ShellCardBody = styled.div`
  padding: var(--space-4);
`;

export const ShellMuted = styled.span`
  color: var(--color-neutral);
  font-size: var(--font-size-sm);
`;

export const ShellPillRow = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
`;

export const ShellPill = styled.button<{ $active?: boolean }>`
  height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid
    ${(props) =>
      props.$active ? "var(--color-accent)" : "rgba(99, 120, 136, 0.32)"};
  background: ${(props) =>
    props.$active ? "var(--color-accent-muted)" : "transparent"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const PlaceholderStack = styled.div`
  display: grid;
  gap: var(--space-3);
`;

export const PlaceholderBlock = styled.div<{ $height?: string }>`
  height: ${(props) => props.$height || "16px"};
  border-radius: var(--radius-md);
  background: rgba(99, 120, 136, 0.22);
`;

export const NavPlaceholder = styled.div`
  display: grid;
  gap: var(--space-2);
`;

export const NavItemPlaceholder = styled.div<{ $active?: boolean }>`
  height: 42px;
  border-radius: var(--radius-md);
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(0, 231, 0, 0.4)" : "rgba(99, 120, 136, 0.18)"};
  background: ${(props) =>
    props.$active ? "rgba(0, 231, 0, 0.08)" : "rgba(45, 74, 90, 0.22)"};
`;

export const EventBoard = styled.div`
  display: grid;
  gap: 1px;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(99, 120, 136, 0.28);
  background: rgba(99, 120, 136, 0.18);
`;

export const EventRow = styled.div`
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) 280px 72px;
  align-items: center;
  gap: var(--space-3);
  min-height: 72px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-base);

  @media (max-width: 768px) {
    grid-template-columns: 72px minmax(0, 1fr) 140px 52px;
    min-height: 64px;
    padding: var(--space-3);
    gap: var(--space-2);
  }
`;

export const OddsPlaceholderRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
`;

export const OddsPlaceholder = styled.div`
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(99, 120, 136, 0.24);
  background: rgba(45, 74, 90, 0.24);
`;

export const MobileActionBar = styled.div`
  display: none;

  @media (max-width: 1024px) {
    position: fixed;
    right: var(--space-4);
    bottom: 72px;
    left: var(--space-4);
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: rgba(15, 31, 42, 0.98);
    border: 1px solid rgba(0, 231, 0, 0.22);
    box-shadow: var(--shadow-overlay);
  }
`;

export const BottomNav = styled.nav`
  display: none;

  @media (max-width: 768px) {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 25;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1px;
    padding-top: 1px;
    background: rgba(99, 120, 136, 0.18);
  }
`;

export const BottomNavItem = styled.button<{ $active?: boolean }>`
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  padding: var(--space-2) 0;
  background: ${(props) =>
    props.$active ? "var(--color-bg-elevated)" : "var(--color-bg-overlay)"};
  color: ${(props) => (props.$active ? "#ffffff" : "var(--color-neutral)")};
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);
`;
