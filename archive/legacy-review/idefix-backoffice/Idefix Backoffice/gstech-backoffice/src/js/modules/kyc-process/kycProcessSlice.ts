import api from "../../core/api";
import { openDialog } from "../../dialogs";
import { updatePlayerList, changePlayerTab } from "../sidebar";
import { fetchPlayer } from "../player";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { DocumentBase, Kyc } from "app/types";
import { FormikHelpers } from "formik";

interface KycProcessState {
  isFetching: boolean;
  document?: Kyc | null;
  error?: boolean;
}

const initialState: KycProcessState = {
  isFetching: false,
  document: null,
};

export const fetchKycDocument = createAsyncThunk<Kyc | undefined, { playerId: number; documentId: number }>(
  "kyc-process/fetch-kyc-document",
  async ({ playerId, documentId }) => {
    try {
      const documents = await api.kyc.getDocument(playerId, documentId);
      return documents;
    } catch (err) {
      console.log(err, "error");
    }
  },
);

export const submitDocument = (
  playerId: number,
  kycDocumentId: number,
  document: DocumentBase,
  formikActions: FormikHelpers<any>,
) => async (dispatch: any) => {
  try {
    await api.kyc.verify(playerId, kycDocumentId, document);
    dispatch(updatePlayerList());
    dispatch(changePlayerTab(playerId, "player-info"));
    dispatch(fetchPlayer(playerId));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};

export const editImage = (playerId: number, prevPhotoId: string, newImage: any, documentId: number) => (
  dispatch: any,
) =>
  api.photos
    .uploadPhoto(newImage)
    .then(photoDraft =>
      dispatch(openDialog("override-document-photo", { playerId, prevPhotoId, newPhotoId: photoDraft.id, documentId })),
    );

const kycProcessSlice = createSlice({
  name: "kycProcess",
  initialState,
  reducers: { dropState: () => initialState },
  extraReducers: builder => {
    builder.addCase(fetchKycDocument.pending, state => {
      state.isFetching = true;
    });
    builder.addCase(fetchKycDocument.fulfilled, (state, action) => {
      state.document = action.payload;
      state.isFetching = false;
    });
    builder.addCase(fetchKycDocument.rejected, state => {
      state.error = true;
      state.isFetching = false;
    });
  },
});

export const {
  reducer,
  actions: { dropState },
} = kycProcessSlice;
