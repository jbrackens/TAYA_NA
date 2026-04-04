'use client';

import styled from 'styled-components';
import { Button, Badge } from '../shared';
import { useState } from 'react';

const PanelContainer = styled.div`
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  padding: 20px;
`;

const PanelTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const SelectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const SelectionRow = styled.div<{ $selected?: boolean }>`
  padding: 12px;
  background-color: #0f3460;
  border-radius: 4px;
  border: 2px solid ${(props) => (props.$selected ? '#4a7eff' : 'transparent')};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    border-color: #4a7eff;
  }
`;

const SelectionInfo = styled.div`
  flex: 1;
`;

const SelectionName = styled.div`
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
  margin-bottom: 4px;
`;

const SelectionStats = styled.div`
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #a0a0a0;
`;

const SelectCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4a7eff;
`;

const SummaryContainer = styled.div`
  background-color: #0f3460;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 3px solid #4a7eff;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SummaryLabel = styled.span`
  color: #a0a0a0;
`;

const SummaryValue = styled.span`
  color: #4a7eff;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #a0a0a0;
`;

export interface SettlementSelection {
  id: string;
  name: string;
  betCount: number;
  potentialPayout: number;
}

interface SettlementPanelProps {
  selections?: SettlementSelection[];
  onSettle?: (selectedIds: string[]) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function SettlementPanel({
  selections = [],
  onSettle,
  onCancel,
  isLoading = false,
}: SettlementPanelProps) {
  const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedWinners);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedWinners(newSelected);
  };

  const affectedBets = selections
    .filter((s) => selectedWinners.has(s.id))
    .reduce((sum, s) => sum + s.betCount, 0);

  const totalPayout = selections
    .filter((s) => selectedWinners.has(s.id))
    .reduce((sum, s) => sum + s.potentialPayout, 0);

  const handleSettle = () => {
    onSettle?.(Array.from(selectedWinners));
  };

  return (
    <PanelContainer>
      <PanelTitle>Market Settlement</PanelTitle>

      <PanelTitle style={{ fontSize: '14px', marginTop: '16px' }}>Select Winner(s)</PanelTitle>
      {selections.length > 0 ? (
        <SelectionsList>
          {selections.map((selection) => (
            <SelectionRow
              key={selection.id}
              $selected={selectedWinners.has(selection.id)}
              onClick={() => handleToggleSelection(selection.id)}
            >
              <SelectionInfo>
                <SelectionName>{selection.name}</SelectionName>
                <SelectionStats>
                  <span>Bets: {selection.betCount}</span>
                  <span>Payout: ${selection.potentialPayout.toLocaleString()}</span>
                </SelectionStats>
              </SelectionInfo>
              <SelectCheckbox
                type="checkbox"
                checked={selectedWinners.has(selection.id)}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
            </SelectionRow>
          ))}
        </SelectionsList>
      ) : (
        <EmptyState>No selections available</EmptyState>
      )}

      {selectedWinners.size > 0 && (
        <SummaryContainer>
          <SummaryRow>
            <SummaryLabel>Winners Selected:</SummaryLabel>
            <SummaryValue>{selectedWinners.size}</SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Affected Bets:</SummaryLabel>
            <SummaryValue>{affectedBets}</SummaryValue>
          </SummaryRow>
          <SummaryRow style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #16213e' }}>
            <SummaryLabel style={{ color: '#ffffff' }}>Total Payout:</SummaryLabel>
            <SummaryValue style={{ color: '#f87171' }}>
              ${totalPayout.toLocaleString()}
            </SummaryValue>
          </SummaryRow>
        </SummaryContainer>
      )}

      <ActionButtons>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleSettle}
          disabled={isLoading || selectedWinners.size === 0}
        >
          {isLoading ? 'Settling...' : 'Confirm & Settle'}
        </Button>
      </ActionButtons>
    </PanelContainer>
  );
}
