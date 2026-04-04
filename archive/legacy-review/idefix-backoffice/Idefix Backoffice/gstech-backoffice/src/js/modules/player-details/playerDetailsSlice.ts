//@ts-nocheck
import {
  createAction,
  createAsyncThunk,
  createReducer,
  createSelector,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { PlayerWithUpdate } from "app/types";
import { FormikHelpers } from "formik";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface PlayerDetailsByIdState {
  isFetching?: boolean;
  isSaving?: boolean;
  isEditing?: boolean;
  playerDetails?: PlayerWithUpdate;
  error?: any;
}

const initialState: PlayerDetailsByIdState = {
  isFetching: undefined,
  playerDetails: undefined,
  error: undefined,
};

export const fetchPlayerDetailsLoading = createAction("player-details/fetch-player-loading", (id: number) => ({
  payload: { id },
}));

export const fetchPlayerDetailsSuccess = createAction(
  "player-details/fetch-player-success",
  (playerDetails: PlayerWithUpdate) => ({
    payload: playerDetails,
  }),
);

export const fetchPlayerDetailsError = createAction("player-details/fetch-player-error", (id, error) => ({
  payload: { id, error },
}));

export const fetchPlayerDetails = createAsyncThunk("player-details/fetch", async (playerId: number, { dispatch }) => {
  dispatch(fetchPlayerDetailsLoading(playerId));
  try {
    const playerDetails = await api.players.get(playerId);
    dispatch(fetchPlayerDetailsSuccess(playerDetails));
  } catch (err) {
    dispatch(fetchPlayerDetailsError(playerId, err));
  }
});

export const updatePlayerDetails = createAction(
  "player-details/update-player-details",
  ({ id, playerDetails }: { id: number; playerDetails: PlayerWithUpdate }) => ({
    payload: { id, playerDetails },
  }),
);

export const editPlayer = createAction("player-details/edit-player", (id: number) => ({
  payload: { id },
}));
export const cancelEdit = createAction("player-details/edit-player-cancel", (id: number) => ({
  payload: { id },
}));
export const savePlayerLoading = createAction("player-details/save-player-loading", (id: number) => ({
  payload: { id },
}));
export const savePlayerSuccess = createAction("player-details/save-player-success", (id: number) => ({
  payload: { id },
}));
export const savePlayerError = createAction("player-details/save-player-error", (id: number) => ({
  payload: { id },
}));

export const savePlayer = createAsyncThunk<
  void,
  { playerId: number; formValues: PlayerWithUpdate; formikActions: FormikHelpers<PlayerWithUpdate> }
>("player-details/save-player", async ({ playerId, formValues, formikActions }, { dispatch }) => {
  dispatch(savePlayerLoading(playerId));
  try {
    const playerDetails = await api.players.update(playerId, formValues);
    dispatch(updatePlayerDetails({ id: playerId, playerDetails }));
    dispatch(savePlayerSuccess(playerId));
  } catch (error) {
    dispatch(savePlayerError(playerId));
    formikActions.resetForm();
    formikActions.setFieldError("general", error.message);
  }
});

export const changeFormValue = createAction(
  "player-details/change-form-value",
  (playerId: number, name: string, value: string) => ({
    payload: { id: playerId, name, value },
  }),
);

const playerReducer = createReducer(initialState, builder => {
  builder.addCase(updatePlayerDetails, (state, action) => {
    state.playerDetails = action.payload.playerDetails;
  });
  builder
    .addCase(fetchPlayerDetailsLoading, state => {
      state.isFetching = true;
    })
    .addCase(fetchPlayerDetailsSuccess, (state, action) => {
      state.playerDetails = action.payload;
      state.isFetching = false;
    })
    .addCase(fetchPlayerDetailsError, (state, action) => {
      state.error = action.payload.error;
      state.isFetching = false;
    });
  builder
    .addCase(savePlayerLoading, state => {
      state.isSaving = true;
    })
    .addCase(savePlayerSuccess, state => {
      state.isSaving = false;
      state.isEditing = false;
    })
    .addCase(savePlayerError, state => {
      state.isSaving = false;
      state.isEditing = false;
      state.error = true;
    });
  builder.addCase(editPlayer, state => {
    state.isEditing = true;
  });
  builder.addCase(cancelEdit, state => {
    state.isEditing = false;
  });
});

type PlayerDetailsState =
  | {
      [key: number]: PlayerDetailsByIdState;
    }
  | {};

const initialPlayerDetailsState: PlayerDetailsState = {};

const playerDetailsSlice = createSlice({
  name: "playerDetails",
  initialState: initialPlayerDetailsState,
  reducers: {},
  extraReducers: builder => {
    function sharedReducer(state: any, action: PayloadAction<any>) {
      state[action.payload.id] = playerReducer(state[action.payload.id], action);
    }

    builder
      .addCase(updatePlayerDetails, sharedReducer)
      .addCase(fetchPlayerDetailsLoading, sharedReducer)
      .addCase(fetchPlayerDetailsSuccess, sharedReducer)
      .addCase(fetchPlayerDetailsError, sharedReducer)
      .addCase(savePlayerLoading, sharedReducer)
      .addCase(savePlayerSuccess, sharedReducer)
      .addCase(savePlayerError, sharedReducer)
      .addCase(editPlayer, sharedReducer)
      .addCase(cancelEdit, sharedReducer)
      .addCase(changeFormValue, sharedReducer);
  },
});

export const { reducer, actions } = playerDetailsSlice;
const getPlayerDetailsState = (state: RootState) => state.playerDetails;

export const getPlayerDetailsForm = (state: RootState, playerId: number) => state.playerDetails[playerId] || {};
const getPlayerId = (state: RootState, playerId: number) => playerId;

export const getPlayerDetails = createSelector(getPlayerDetailsState, getPlayerId, (playerDetails, playerId) => {
  if (playerDetails[playerId] && playerDetails[playerId].playerDetails) {
    return playerDetails[playerId].playerDetails;
  }
});

export const getPromotions = createSelector(getPlayerDetails, playerDetails => {
  if (playerDetails) {
    return {
      allowEmailPromotions: playerDetails.allowEmailPromotions,
      allowSMSPromotions: playerDetails.allowSMSPromotions,
      activated: playerDetails.activated,
      testPlayer: playerDetails.testPlayer,
    };
  }
});
