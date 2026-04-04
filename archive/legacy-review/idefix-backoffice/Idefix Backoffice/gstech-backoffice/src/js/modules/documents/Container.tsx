import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import { fetchKycDocuments, getKycDocuments } from "./documentsSlice";
import { openDialog } from "../../dialogs";
import { Kyc } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const { kycDocuments, isLoading } = useSelector(getKycDocuments);

  useEffect(() => {
    dispatch(fetchKycDocuments(playerId));
  }, [dispatch, playerId]);

  const handleEditDocument = useCallback(
    (document: Kyc) => dispatch(openDialog("view-player-document", { playerId, document })),
    [dispatch, playerId],
  );

  return <Component documents={kycDocuments} onEditDocument={handleEditDocument} isLoading={isLoading} />;
};

export default Container;
