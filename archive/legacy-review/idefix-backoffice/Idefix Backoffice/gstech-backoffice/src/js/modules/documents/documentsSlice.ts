import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Kyc } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface DocumentsState {
  isLoading: boolean;
  kycDocuments: Kyc[];
}

const initialState: DocumentsState = {
  isLoading: false,
  kycDocuments: [],
};

export const fetchKycDocuments = createAsyncThunk("documents/fetch-kyc-documents", async (playerId: number) => {
  try {
    const documents = await api.kyc.get(playerId);
    return documents;
  } catch (e) {
    console.log(e);
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
        state.kycDocuments = action.payload;
      }
    });
  },
});

export const { reducer, actions } = documentsSlice;

export const getKycDocuments = (state: RootState) => state.documents;
