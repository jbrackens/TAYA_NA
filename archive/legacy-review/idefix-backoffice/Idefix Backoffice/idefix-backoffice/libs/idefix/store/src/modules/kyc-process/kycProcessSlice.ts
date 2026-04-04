import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { DIALOG, DocumentBase, Kyc } from "@idefix-backoffice/idefix/types";

import { updatePlayerList, changePlayerTab } from "../sidebar";
import { fetchPlayer } from "../player";
import { RootState } from "../../rootReducer";
import { openDialog } from "../dialogs";
import { AppDispatch } from "../../createStore";

interface KycProcessState {
  isFetching: boolean;
  document?: Kyc | null;
  error?: boolean;
}

const initialState: KycProcessState = {
  isFetching: false,
  document: null
};

export const fetchKycDocument = createAsyncThunk<Kyc | undefined, { playerId: number; documentId: number }>(
  "kyc-process/fetch-kyc-document",
  async ({ playerId, documentId }) => {
    try {
      const documents = await api.kyc.getDocument(playerId, documentId);
      return documents;
    } catch (err) {
      console.log(err, "error");
      return;
    }
  }
);

export const submitDocument = createAsyncThunk<
  void,
  { playerId: number; kycDocumentId: number; document: DocumentBase; formikActions: FormikHelpers<any> },
  { dispatch: AppDispatch }
>("kyc-process/submit-document", async ({ playerId, kycDocumentId, document, formikActions }, { dispatch }) => {
  try {
    await api.kyc.verify(playerId, kycDocumentId, document);
    dispatch(updatePlayerList());
    dispatch(changePlayerTab(playerId, "player-info"));
    dispatch(fetchPlayer(playerId));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
});

export const editImage = createAsyncThunk<
  void,
  { playerId: number; prevPhotoId: string; newImage: any; documentId: number },
  { dispatch: AppDispatch }
>("kyc-process/edit-image", async ({ playerId, prevPhotoId, newImage, documentId }, { dispatch }) => {
  try {
    const photoDraft = await api.photos.uploadPhoto(newImage);
    dispatch(
      openDialog(DIALOG.OVERRIDE_DOCUMENT_PHOTO, { playerId, prevPhotoId, newPhotoId: photoDraft.id, documentId })
    );
  } catch (err) {
    console.log(err);
    return;
  }
});

const kycProcessSlice = createSlice({
  name: "kycProcess",
  initialState,
  reducers: { dropState: () => initialState },
  extraReducers: builder => {
    builder.addCase(fetchKycDocument.pending, state => {
      state.isFetching = true;
    });
    builder.addCase(fetchKycDocument.fulfilled, (state, action) => {
      // @ts-ignore
      state.document = action.payload;
      state.isFetching = false;
    });
    builder.addCase(fetchKycDocument.rejected, state => {
      state.error = true;
      state.isFetching = false;
    });
  }
});

export const {
  reducer,
  actions: { dropState }
} = kycProcessSlice;

const getState = (state: RootState) => state.kycProcess;

export const getDocument = createSelector(getState, state => state.document);
export const getIsLoadingDocument = createSelector(getState, state => state.isFetching);
