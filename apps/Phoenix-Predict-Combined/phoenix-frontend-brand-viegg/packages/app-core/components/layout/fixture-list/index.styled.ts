import styled from "styled-components";
import { List, Button } from "antd";
import { motion } from "framer-motion";

export const FixtureContainer = styled(List)`
  background: transparent;
  border: 0;

  & .ant-list-item {
    border: 0;
    padding: 0;
  }
`;

export const FixtureBlock = styled.div`
  display: grid;
`;

export const FxtureHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-3);
  background: rgba(18, 36, 52, 0.98);
  border-top: 1px solid rgba(99, 120, 136, 0.12);
  border-bottom: 1px solid rgba(99, 120, 136, 0.22);
`;

export const FixtureHeaderMeta = styled.div`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-neutral);
`;

export const FixtureHeaderText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const FixtureHeaderAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover {
    color: #ffffff;
  }
`;

export const FixtureContent = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
  align-items: center;
  gap: var(--space-4);
  min-height: 76px;
  padding: var(--space-3);
  border-bottom: 1px solid rgba(99, 120, 136, 0.18);
  background: transparent;
  transition: background var(--duration-transition) var(--ease-standard);

  &:hover {
    background: rgba(33, 55, 67, 0.42);
  }

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  @media (max-width: 767px) {
    padding: var(--space-3) var(--space-2);
  }
`;

export const FixtureMain = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: center;

  @media (max-width: 767px) {
    grid-template-columns: 72px minmax(0, 1fr);
  }
`;

export const FixtureSchedule = styled.div`
  display: grid;
  gap: 4px;
  align-content: center;
  justify-items: start;
`;

export const FixtureScheduleTime = styled.span`
  color: #ffffff;
  font-size: var(--font-size-sm);
  font-weight: 700;
`;

export const FixtureScheduleDate = styled.span`
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
`;

export const CompetitorsContainer = styled.div`
  display: grid;
  gap: 8px;
`;

export const CompetitorRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
`;

export const TemporaryEmptyAvater = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(178, 190, 195, 0.34);
  display: inline-block;
  flex-shrink: 0;
`;

export const CompetitorIdentity = styled.span`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
`;

export const CompetitorName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #ffffff;
  font-size: var(--font-size-md);
  font-weight: 600;
`;

export const ScoreContainer = styled.div`
  min-width: 26px;
  text-align: center;
`;

export const ScoreValue = styled.span`
  color: #ffffff;
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: 1;
`;

export const BetButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);

  @media (max-width: 1023px) {
    justify-content: flex-start;
  }
`;

export const BetButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 1fr));
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;

  &[data-selection-count="2"] {
    grid-template-columns: repeat(2, minmax(72px, 1fr));
  }

  @media (max-width: 767px) {
    width: 100%;
  }
`;

export const MarketsCountButton = styled(Button)`
  min-width: 62px;
  height: 36px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(99, 120, 136, 0.22) !important;
  background: rgba(33, 55, 67, 0.78) !important;
  color: var(--color-neutral) !important;
  font-size: var(--font-size-sm);
  font-weight: 700;
  box-shadow: none;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover,
  &:focus,
  &:active {
    color: #ffffff !important;
    border-color: var(--color-accent) !important;
    background: rgba(45, 74, 90, 0.8) !important;
  }
`;

export const MarketsCountButtonContainer = styled.div`
  flex-shrink: 0;
`;

export const LiveBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  padding: 0;
  color: var(--color-live);
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-live);
    box-shadow: 0 0 0 rgba(231, 51, 42, 0.5);
    animation: sportsbook-row-live-pulse 2s infinite;
  }

  @keyframes sportsbook-row-live-pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(231, 51, 42, 0.45);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 8px rgba(231, 51, 42, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(231, 51, 42, 0);
    }
  }
`;

export const IconContainer = styled.div`
  min-height: 20px;
  color: var(--color-neutral);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 18px;
  }
`;

export const LoadMoreButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: var(--space-4);
`;

export const LoadMoreButton = styled(Button)`
  min-width: 180px;
  height: 42px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 120, 136, 0.22) !important;
  background: rgba(33, 55, 67, 0.82) !important;
  color: #ffffff !important;
  font-size: var(--font-size-sm);
  font-weight: 700;
  box-shadow: none;
  transition: all var(--duration-transition) var(--ease-standard);

  &:hover,
  &:focus,
  &:active {
    background: rgba(45, 74, 90, 0.88) !important;
    border-color: var(--color-accent) !important;
    color: #ffffff !important;
  }
`;

export const FixtureSkeletonCard = styled(motion.div)`
  height: 76px;
  margin: 0;
  border-bottom: 1px solid rgba(99, 120, 136, 0.18);
  background: rgba(33, 55, 67, 0.56);
`;
