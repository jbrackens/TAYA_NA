import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";

import api from "@idefix-backoffice/idefix/api";
import { RootState } from "../../rootReducer";

interface TagsState {
  isLoading: boolean;
  tags: string[];
}

const initialState: TagsState = {
  isLoading: false,
  tags: []
};

export const fetchPlayerTags = createAsyncThunk<string[], number>("tags/fetch-tags", async playerId => {
  try {
    return await api.players.getTags(playerId);
  } catch (err) {
    console.log(err);
    return err;
  }
});

export const addPlayerTag = createAsyncThunk<string[], { playerId: number; tag: string }>(
  "tags/add-tag",
  async ({ playerId, tag }) => {
    try {
      return await api.players.addTag(playerId, tag);
    } catch (err) {
      console.log(err);
      return err;
    }
  }
);

export const removePlayerTag = createAsyncThunk<string[], { playerId: number; tag: string }>(
  "tags/remove-tag",
  async ({ playerId, tag }) => {
    try {
      return await api.players.removeTag(playerId, tag);
    } catch (err) {
      console.log(err);
      return err;
    }
  }
);

const tagsSlice = createSlice({
  name: "tags",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPlayerTags.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchPlayerTags.fulfilled, (state, action) => {
        const tags = action.payload;

        state.isLoading = false;
        state.tags = tags;
      })
      .addCase(fetchPlayerTags.rejected, state => {
        state.isLoading = false;
      });

    builder
      .addCase(addPlayerTag.pending, state => {
        state.isLoading = true;
      })
      .addCase(addPlayerTag.fulfilled, (state, action) => {
        const tags = action.payload;

        state.isLoading = false;
        state.tags = tags;
      })
      .addCase(addPlayerTag.rejected, state => {
        state.isLoading = false;
      });

    builder
      .addCase(removePlayerTag.pending, state => {
        state.isLoading = true;
      })
      .addCase(removePlayerTag.fulfilled, (state, action) => {
        const tags = action.payload;

        state.isLoading = false;
        state.tags = tags;
      })
      .addCase(removePlayerTag.rejected, state => {
        state.isLoading = false;
      });
  }
});

export const { reducer } = tagsSlice;

const getState = (state: RootState) => state.tags;

export const getTags = createSelector(getState, state => state.tags);
export const getIsLoading = createSelector(getState, state => state.isLoading);
