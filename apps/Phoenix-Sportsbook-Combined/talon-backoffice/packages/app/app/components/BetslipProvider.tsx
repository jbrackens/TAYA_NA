'use client';

import React, { createContext, useState, useCallback, useMemo } from 'react';

export interface BetSelection {
  id: string;
  fixtureId: string;
  marketId: string;
  selectionId: string;
  matchName: string;
  marketName: string;
  selectionName: string;
  odds: number;
}

export interface BetslipContextType {
  selections: BetSelection[];
  stakePerLeg: number;
  parlayMode: boolean;
  totalStake: number;
  potentialReturn: number;
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearAll: () => void;
  setStakePerLeg: (stake: number) => void;
  setParlayMode: (mode: boolean) => void;
}

export const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

interface BetslipProviderProps {
  children: React.ReactNode;
}

export const BetslipProvider: React.FC<BetslipProviderProps> = ({ children }) => {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stakePerLeg, setStakePerLeg] = useState(10);
  const [parlayMode, setParlayMode] = useState(false);

  const addSelection = useCallback((selection: BetSelection) => {
    setSelections((prev) => {
      // Don't add duplicate selections
      if (prev.some((s) => s.selectionId === selection.selectionId && s.marketId === selection.marketId)) {
        return prev;
      }
      return [...prev, { ...selection, id: `${Date.now()}-${Math.random()}` }];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelections([]);
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    if (selections.length === 0) {
      return { totalStake: 0, potentialReturn: 0 };
    }

    let totalStake = 0;
    let potentialReturn = 0;

    if (parlayMode) {
      // Parlay: single stake, multiply all odds
      totalStake = stakePerLeg;
      potentialReturn = selections.reduce((acc, sel) => acc * sel.odds, stakePerLeg);
    } else {
      // Single bets: stake per selection, sum of individual returns
      totalStake = stakePerLeg * selections.length;
      potentialReturn = selections.reduce((acc, sel) => acc + stakePerLeg * sel.odds, 0);
    }

    return { totalStake, potentialReturn };
  }, [selections, stakePerLeg, parlayMode]);

  const value: BetslipContextType = {
    selections,
    stakePerLeg,
    parlayMode,
    totalStake: totals.totalStake,
    potentialReturn: totals.potentialReturn,
    addSelection,
    removeSelection,
    clearAll,
    setStakePerLeg,
    setParlayMode,
  };

  return <BetslipContext.Provider value={value}>{children}</BetslipContext.Provider>;
};
