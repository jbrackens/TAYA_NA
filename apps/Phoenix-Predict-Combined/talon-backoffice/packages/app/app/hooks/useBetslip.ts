'use client';

import { useContext } from 'react';
import { BetslipContext } from '../components/BetslipProvider';

export const useBetslip = () => {
  const context = useContext(BetslipContext);
  if (!context) {
    throw new Error('useBetslip must be used within BetslipProvider');
  }
  return context;
};
