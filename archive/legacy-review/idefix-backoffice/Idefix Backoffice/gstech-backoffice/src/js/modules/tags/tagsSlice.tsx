import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../core/api";

interface TagsState {
  isLoading: boolean;
  tags: string[];
}

const initialState: TagsState = {
  isLoading: false,
  tags: [],
};

export const fetchPlayerTags = createAsyncThunk<string[], { playerId: number }>(
  "tags/fetch-tags",
  async ({ playerId }) => {
    try {
      const tags = await api.players.getTags(playerId);
      return tags;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const addPlayerTag = createAsyncThunk<string[], { playerId: number; tag: string }>(
  "tags/add-tag",
  async ({ playerId, tag }) => {
    try {
      const tags = await api.players.addTag(playerId, tag);
      return tags;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
);

export const removePlayerTag = createAsyncThunk<string[], { playerId: number; tag: string }>(
  "tags/remove-tag",
  async ({ playerId, tag }) => {
    try {
      const tags = await api.players.removeTag(playerId, tag);
      return tags;
    } catch (err) {
      console.log(err);
      return err;
    }
  },
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
      });
    builder
      .addCase(removePlayerTag.pending, state => {
        state.isLoading = true;
      })
      .addCase(removePlayerTag.fulfilled, (state, action) => {
        const tags = action.payload;

        state.isLoading = false;
        state.tags = tags;
      });
  },
});

export const { reducer } = tagsSlice;
