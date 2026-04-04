"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";

export interface BetSelection {
  id: string;
  fixtureId: string;
  marketId: string;
  selectionId: string;
  matchName: string;
  marketName: string;
  selectionName: string;
  odds: number;
  initialOdds: number;
}

export interface BetslipContextType {
  selections: BetSelection[];
  stakePerLeg: number;
  parlayMode: boolean;
  totalStake: number;
  potentialReturn: number;
  isOpen: boolean;
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearAll: () => void;
  setStakePerLeg: (stake: number) => void;
  setParlayMode: (mode: boolean) => void;
  syncInitialOdds: () => void;
  openBetslip: () => void;
  closeBetslip: () => void;
  toggleBetslip: () => void;
}

export const BetslipContext = createContext<BetslipContextType | undefined>(
  undefined,
);

interface BetslipProviderProps {
  children: React.ReactNode;
}

export const BetslipProvider: React.FC<BetslipProviderProps> = ({
  children,
}) => {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stakePerLeg, setStakePerLeg] = useState(10);
  const [parlayMode, setParlayMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openBetslip = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  }, []);

  const closeBetslip = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleBetslip = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const addSelection = useCallback((selection: BetSelection) => {
    setSelections((prev) => {
      // Don't add duplicate selections
      if (
        prev.some(
          (s) =>
            s.selectionId === selection.selectionId &&
            s.marketId === selection.marketId,
        )
      ) {
        return prev;
      }
      const next = [
        ...prev,
        {
          ...selection,
          id: `${Date.now()}-${Math.random()}`,
          initialOdds: selection.odds,
        },
      ];
      // Auto-open when going from 0 to 1 selection
      if (prev.length === 0 && next.length === 1) {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setIsOpen(true);
      }
      return next;
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => {
      const next = prev.filter((s) => s.id !== id);
      // Auto-close after 1s delay when going from 1 to 0 selections
      if (prev.length === 1 && next.length === 0) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          setIsOpen(false);
          closeTimerRef.current = null;
        }, 1000);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelections([]);
    setIsOpen(false);
  }, []);

  const syncInitialOdds = useCallback(() => {
    setSelections((prev) => prev.map((s) => ({ ...s, initialOdds: s.odds })));
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
      potentialReturn = selections.reduce(
        (acc, sel) => acc * sel.odds,
        stakePerLeg,
      );
    } else {
      // Single bets: stake per selection, sum of individual returns
      totalStake = stakePerLeg * selections.length;
      potentialReturn = selections.reduce(
        (acc, sel) => acc + stakePerLeg * sel.odds,
        0,
      );
    }

    return { totalStake, potentialReturn };
  }, [selections, stakePerLeg, parlayMode]);

  const value: BetslipContextType = {
    selections,
    stakePerLeg,
    parlayMode,
    totalStake: totals.totalStake,
    potentialReturn: totals.potentialReturn,
    isOpen,
    addSelection,
    removeSelection,
    clearAll,
    setStakePerLeg,
    setParlayMode,
    syncInitialOdds,
    openBetslip,
    closeBetslip,
    toggleBetslip,
  };

  return (
    <BetslipContext.Provider value={value}>{children}</BetslipContext.Provider>
  );
};
