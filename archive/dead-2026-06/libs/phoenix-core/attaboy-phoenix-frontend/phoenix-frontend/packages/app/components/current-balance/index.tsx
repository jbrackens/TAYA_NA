import React, { useEffect, useState } from "react";
import { useApi } from "../../services/api/api-service";
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

const CurrentBalanceComponent: React.FC = () => {
  const dispatch = useDispatch();
  const isBalanceUpdateNeeded = useSelector(selectIsBalanceUpdateNeeded);
  const { triggerApi, data } = useApi("punters/wallet/balance", "GET");
  const [balance, setBalance] = useState(0);
  const { formatCurrencyValue } = useCurrency();

  const reducerBalance = useSelector(selectCurrentBalance);

  useEffect((): any => {
    setBalance(reducerBalance);
  }, [reducerBalance]);

  const fetchCurrentBalance = async () => {
    triggerApi(undefined, {});
  };

  useEffect(() => {
    if (isBalanceUpdateNeeded) {
      fetchCurrentBalance();
      dispatch(setBalanceUpdateNeeded(false));
    }
  }, [isBalanceUpdateNeeded]);

  useEffect(() => {
    // to check is 2500 threshold modal should be visible
    dispatch(setIsAccountDataUpdateNeeded(true));
  }, [balance]);

  useEffect((): any => {
    fetchCurrentBalance();
  }, []);

  useEffect((): any => {
    if (data) {
      setBalance(data.realMoney.value.amount);
      dispatch(setCurrentBalance(data.realMoney.value.amount));
    }
  }, [data]);

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
