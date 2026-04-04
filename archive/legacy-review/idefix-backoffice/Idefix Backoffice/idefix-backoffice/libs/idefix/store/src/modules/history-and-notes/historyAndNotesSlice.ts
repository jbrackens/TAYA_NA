import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { EventType, PlayerEvent } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

interface HistoryAndNotesState {
  events: PlayerEvent[];
  isFetching: boolean;
  filters: Record<EventType, boolean>;
}

const initialState: HistoryAndNotesState = {
  events: [],
  isFetching: false,
  filters: {
    note: true,
    account: true,
    activity: false,
    fraud: false,
    transaction: false
  }
};

export const fetchEvents = createAsyncThunk("history-and-notes/fetch-events", async (playerId: number) => {
  try {
    const events = await api.players.getEvents(playerId);
    return events;
  } catch (err) {
    console.log(err, "error");
    return;
  }
});

const historyAndNotesSlice = createSlice({
  name: "historyAndNotes",
  initialState,
  reducers: {
    changeFilterValue(state, action) {
      state.filters = { ...state.filters, [action.payload.filter]: action.payload.value };
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchEvents.pending, state => {
      state.isFetching = true;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      if (action.payload) {
        state.events = action.payload;
      }
      state.isFetching = false;
    });
    builder.addCase(fetchEvents.rejected, state => {
      state.isFetching = false;
    });
  }
});

export const {
  reducer,
  actions: { changeFilterValue }
} = historyAndNotesSlice;

const getState = (state: RootState) => state.historyAndNotes;

export const getEvents = createSelector(getState, state => {
  const { events, filters } = state;

  return events.filter(event => filters[event.type]);
});
export const getIsLoadingEvents = createSelector(getState, state => state.isFetching);

export const getFilters = createSelector(getState, state => state.filters);
