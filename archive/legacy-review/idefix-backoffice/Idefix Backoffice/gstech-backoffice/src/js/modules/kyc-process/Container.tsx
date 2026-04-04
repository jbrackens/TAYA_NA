import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import find from "lodash/fp/find";
import isEmpty from "lodash/fp/isEmpty";
import Box from "@material-ui/core/Box";
import { validationSchema } from "../../forms/kyc-process";
import { updateAccount } from "../../dialogs/view-payment-account/actions";
import { addPaymentAccount } from "../../dialogs/add-payment-account/actions";
import { fetchPaymentAccounts } from "../payments";
import { dropState, editImage, fetchKycDocument, submitDocument } from "./kycProcessSlice";
import Component from "./Component";

import "./style.css";
import { RootState } from "js/rootReducer";

import { AccountActive, Kyc } from "app/types";
import { openDialog } from "../../dialogs";
import { useParams } from "react-router-dom";

const Container = () => {
  const dispatch = useDispatch();
  const document = useSelector((state: RootState) => state.kycProcess.document);
  const accounts = useSelector((state: RootState) => state.payments.accounts);
  const params = useParams();
  const playerId = Number(params.playerId);
  const documentId = Number(params.kycDocumentId);

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchKycDocument({ playerId, documentId }));
      dispatch(fetchPaymentAccounts(playerId));
    };

    dispatch(dropState());
    fetchData();
  }, [playerId, documentId, dispatch]);

  const handleEditImage = useCallback(
    (prevPhotoId: string, newImage: any, documentId: number) => {
      dispatch(editImage(playerId, prevPhotoId, newImage, documentId));
    },
    [dispatch, playerId],
  );

  const handlePaymentAccountSubmit = useCallback(
    async ({ parameters, ...rest }, formikActions, kycProps) => {
      const accountDraft = {
        ...rest,
        parameters: parameters && !isEmpty(parameters.bic) ? parameters : undefined,
        documents: rest.documents.slice(1, rest.documents.length + 1),
        documentsForRemove: [],
      };

      const { accountId, documentType, fields, kycChecked } = kycProps;

      const newExpiryDate = rest.documents[0].expiryDate;

      const makeDocumentDraft = (accountId: number) => ({
        type: documentType,
        expiryDate: newExpiryDate,
        accountId,
        kycChecked,
        fields,
      });

      if (accountId !== "new") {
        const account = find((acc: AccountActive) => acc.id === accountId)(accounts);

        await dispatch(updateAccount({ playerId, accountId: account!.id, accountDraft, formikActions }));
        return await dispatch(submitDocument(playerId, documentId, makeDocumentDraft(account!.id), formikActions));
      }

      const newAccountId = await dispatch(addPaymentAccount({ playerId, values: accountDraft, formikActions }));
      dispatch(submitDocument(playerId, documentId, makeDocumentDraft(newAccountId as any), formikActions));
    },
    [accounts, dispatch, documentId, playerId],
  );

  const handleKycSubmit = useCallback(
    ({ documentType, expiryDate, fields }, formikActions) => {
      dispatch(
        submitDocument(
          playerId,
          documentId,
          {
            type: documentType,
            expiryDate,
            kycChecked: document!.kycChecked,
            fields,
          },
          formikActions,
        ),
      );
    },
    [dispatch, document, documentId, playerId],
  );

  const handleDecline = useCallback(() => {
    dispatch(openDialog("confirm-decline-kyc", { playerId, documentId }));
  }, [dispatch, documentId, playerId]);

  const initialValues: Kyc = useMemo(
    () =>
      ({
        expiryDate: document && document.expiryDate,
        fields: document && document.fields,
        accountId: document && document.accountId,
        documentType: document && document.documentType,
      } as Kyc),
    [document],
  );

  return (
    <Box p={3}>
      {document && (
        <Formik
          onSubmit={handleKycSubmit}
          validationSchema={validationSchema}
          validateOnChange={true}
          validateOnMount={true}
          enableReinitialize={true}
          initialValues={initialValues}
        >
          {props => (
            <Component
              kycProps={props}
              document={document}
              accounts={accounts}
              playerId={playerId}
              onEditImage={handleEditImage}
              onSubmit={handlePaymentAccountSubmit}
              onDecline={handleDecline}
            />
          )}
        </Formik>
      )}
    </Box>
  );
};

export default Container;
