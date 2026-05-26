"use client";

import React from "react";

interface QuickStakeProps {
  onStakeSelect: (amount: number) => void;
}

const STAKE_OPTIONS = [5, 10, 25, 50, 100];

export const QuickStake: React.FC<QuickStakeProps> = ({ onStakeSelect }) => {
  return (
    <div className="flex gap-2">
      {STAKE_OPTIONS.map((amount) => (
        <button
          key={amount}
          onClick={() => onStakeSelect(amount)}
          className="flex-1 cursor-pointer rounded border border-[#0f3460] bg-[#0f3460] p-2.5 text-xs font-semibold text-white outline-none transition-all duration-200 hover:border-[#4a7eff] hover:bg-[#4a7eff] hover:text-black"
        >
          ${amount}
        </button>
      ))}
    </div>
  );
};

export default QuickStake;
