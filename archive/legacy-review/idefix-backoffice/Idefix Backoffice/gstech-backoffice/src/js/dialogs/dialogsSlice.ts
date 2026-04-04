import { createAction, createReducer } from "@reduxjs/toolkit";
import omit from "lodash/fp/omit";

export const openDialog = createAction("dialogs/open", (dialog: string, payload: any = null) => ({
  payload: { dialog, payload },
}));
export const closeDialog = createAction("dialogs/close", (dialog: string) => ({ payload: dialog }));
export const changeMeta = createAction("dialogs/change-meta", (meta: any) => ({ payload: meta }));

interface DialogsState {
  dialogs: {
    [name: string]: any;
  };
  meta: any;
}

const initialState: DialogsState = {
  dialogs: {},
  meta: null,
};

const dialogsReducer = createReducer(initialState, builder => {
  builder.addCase(openDialog, (state, action) => {
    const { dialog, payload } = action.payload;
    state.dialogs = { ...state.dialogs, [dialog]: payload };
  });
  builder.addCase(closeDialog, (state, action) => {
    const dialog = action.payload;
    state.meta = null;
    state.dialogs = omit(dialog, state.dialogs);
  });
  builder.addCase(changeMeta, (state, action) => {
    const meta = action.payload;
    state.meta = meta;
  });
  builder.addDefaultCase(() => {});
});

export default dialogsReducer;
