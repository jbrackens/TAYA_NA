import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import { openDialog } from "../../dialogs";
import { fetchBonuses } from "./bonusesSlice";
import { fetchFinancialInfo, getPlayerFinancialInfo } from "../player-info";
import { RootState } from "js/rootReducer";
import { PlayerFinancialInfo } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const { bonuses, isFetching } = useSelector((state: RootState) => state.bonuses);
  const financialInfoState = useSelector(getPlayerFinancialInfo);
  const params = useParams();
  const playerId = Number(params.playerId);

  useEffect(() => {
    dispatch(fetchFinancialInfo(playerId));
    dispatch(fetchBonuses(+playerId));
  }, [dispatch, playerId]);

  const handleForfeit = useCallback(
    bonus => dispatch(openDialog("forfeit-bonus", { playerId, bonus })),
    [dispatch, playerId],
  );

  return (
    <Component
      bonuses={bonuses}
      isFetching={isFetching}
      onForfeit={handleForfeit}
      financialInfo={financialInfoState as PlayerFinancialInfo}
    />
  );
};

export default Container;
