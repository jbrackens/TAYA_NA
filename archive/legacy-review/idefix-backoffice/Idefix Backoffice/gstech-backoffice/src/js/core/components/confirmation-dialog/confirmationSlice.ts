import { RootState } from "js/rootReducer";
import { createSlice } from "@reduxjs/toolkit";

interface ConfirmationState {
  open: boolean;
  payload: any;
}

const initialState: ConfirmationState = {
  open: false,
  payload: null,
};

const confirmationSlice = createSlice({
  name: "confirmationDialog",
  initialState,
  reducers: {
    openConfirmationDialog(state, action) {
      state.open = true;
      state.payload = action.payload;
    },
    closeConfirmationDialog() {
      return initialState;
    },
  },
  extraReducers: {},
});

export const {
  reducer,
  actions: { openConfirmationDialog, closeConfirmationDialog },
} = confirmationSlice;

export const getState = (state: RootState) => state.confirmationDialog;
