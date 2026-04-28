"use client";

import styled from "styled-components";
import { Button } from "../shared";
import { useState } from "react";

const EditorRow = styled.div`
  padding: 12px;
  background-color: var(--border-1, #e5dfd2);
  border-radius: 4px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const SelectionName = styled.span`
  font-size: 13px;
  color: var(--t1, #1a1a1a);
  font-weight: 500;
`;

const OddsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OddsButton = styled.button`
  width: 28px;
  height: 28px;
  background-color: var(--focus-ring, #0e7a53);
  color: var(--bg-deep, #f7f3ed);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OddsInput = styled.input`
  width: 70px;
  padding: 6px 8px;
  text-align: center;
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  color: var(--focus-ring, #0e7a53);
  font-weight: 600;
  border-radius: 3px;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--focus-ring, #0e7a53);
  }
`;

const InfoText = styled.span`
  font-size: 11px;
  color: var(--t2, #4a4a4a);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

export interface SelectionData {
  id: string;
  name: string;
  currentOdds: number;
  betCount: number;
  liability: number;
}

interface SelectionOddsEditorProps {
  selection: SelectionData;
  onSave?: (selectionId: string, newOdds: number) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

export function SelectionOddsEditor({
  selection,
  onSave,
  onCancel,
  isSaving = false,
}: SelectionOddsEditorProps) {
  const [odds, setOdds] = useState(selection.currentOdds);

  const handleOddsChange = (delta: number) => {
    const newOdds = Math.max(1.01, odds + delta);
    setOdds(parseFloat(newOdds.toFixed(2)));
  };

  const handleInputChange = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setOdds(Math.max(1.01, parsed));
    }
  };

  const handleSave = () => {
    onSave?.(selection.id, odds);
  };

  return (
    <EditorRow>
      <SelectionName>{selection.name}</SelectionName>

      <OddsContainer>
        <OddsButton
          onClick={() => handleOddsChange(-0.05)}
          disabled={isSaving || odds <= 1.05}
        >
          -
        </OddsButton>
        <OddsInput
          type="number"
          value={odds.toFixed(2)}
          onChange={(e) => handleInputChange(e.target.value)}
          step="0.01"
          min="1.01"
          disabled={isSaving}
        />
        <OddsButton onClick={() => handleOddsChange(0.05)} disabled={isSaving}>
          +
        </OddsButton>
      </OddsContainer>

      <InfoText>
        Bets: <strong>{selection.betCount}</strong>
      </InfoText>

      <InfoText>
        Liability: <strong>${(selection.liability / 1000).toFixed(1)}K</strong>
      </InfoText>

      <ActionButtons>
        <Button
          variant="danger"
          size="sm"
          onClick={handleSave}
          disabled={isSaving || odds === selection.currentOdds}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </ActionButtons>
    </EditorRow>
  );
}
