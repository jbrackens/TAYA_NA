import { createAsyncThunk, createSlice, createSelector } from "@reduxjs/toolkit";

import { Kyc } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface DocumentsState {
  isLoading: boolean;
  kycDocuments: Kyc[];
}

const initialState: DocumentsState = {
  isLoading: false,
  kycDocuments: []
};

export const fetchKycDocuments = createAsyncThunk("documents/fetch-kyc-documents", async (playerId: number) => {
  try {
    const documents = await api.kyc.get(playerId);
    return documents;
  } catch (e) {
    console.log(e);
    return;
  }
});

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchKycDocuments.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchKycDocuments.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload) {
        // @ts-ignore
        state.kycDocuments = action.payload;
      }
    });
    builder.addCase(fetchKycDocuments.rejected, state => {
      state.isLoading = false;
    });
  }
});

export const { reducer, actions } = documentsSlice;

const getKycDocumentsState = (state: RootState) => state.documents;
export const getKycDocuments = createSelector(getKycDocumentsState, state => state.kycDocuments);
export const getIsLoadingKycDocuments = createSelector(getKycDocumentsState, state => state.isLoading);
