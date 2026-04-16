import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BadgeNoStyles, CurrentBalance } from "./index.styled";
import {
  selectCurrentBalance,
  setCurrentBalance,
  selectIsBalanceUpdateNeeded,
  setBalanceUpdateNeeded,
} from "../../lib/slices/cashierSlice";
import { useCurrency } from "../../services/currency";
import { setIsAccountDataUpdateNeeded } from "../../lib/slices/settingsSlice";
import { useBalance } from "../../services/go-api";

const CurrentBalanceComponent: React.FC = () => {
  const dispatch = useDispatch();
  const isBalanceUpdateNeeded = useSelector(selectIsBalanceUpdateNeeded);
  const { data: walletData, refetch } = useBalance();
  const [balance, setBalance] = useState(0);
  const { formatCurrencyValue } = useCurrency();

  const reducerBalance = useSelector(selectCurrentBalance);

  useEffect((): any => {
    setBalance(reducerBalance);
  }, [reducerBalance]);

  useEffect(() => {
    if (isBalanceUpdateNeeded) {
      refetch();
      dispatch(setBalanceUpdateNeeded(false));
    }
  }, [isBalanceUpdateNeeded]);

  useEffect(() => {
    // to check is 2500 threshold modal should be visible
    dispatch(setIsAccountDataUpdateNeeded(true));
  }, [balance]);

  useEffect((): any => {
    if (walletData?.available !== undefined) {
      setBalance(walletData.available);
      dispatch(setCurrentBalance(walletData.available));
    }
  }, [walletData]);

  const numberWithCommas = (value: number) =>
    formatCurrencyValue(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <>
      <CurrentBalance>
        <BadgeNoStyles count={numberWithCommas(balance)} showZero={true} />
      </CurrentBalance>
    </>
  );
};

export { CurrentBalanceComponent };
