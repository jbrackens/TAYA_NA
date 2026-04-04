import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, EntityState } from "@reduxjs/toolkit";
import { ApiServerError, Game, GameManufacturer } from "app/types";
import { toast } from "react-toastify";
import { AxiosError } from "axios";

import api from "../../api";
import { RootState } from "../../redux";

interface IState extends EntityState<Game> {
  isLoading: boolean;
  permalinks: string[];
  gameManufacturer: GameManufacturer[];
}

const gamesAdapter = createEntityAdapter<Game>({
  sortComparer: (a, b) => a.order - b.order
});

const initialState: IState = gamesAdapter.getInitialState({
  isLoading: true,
  permalinks: [],
  gameManufacturer: []
});

export const fetchGames = createAsyncThunk<Game[], string>("games/fetchGames", async (brandId: string, thunkApi) => {
  try {
    const response = await api.games.getGames(brandId);

    const games = response.data.data;
    return games;
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Fetch games failed: ${error.message}`);
      throw err;
    }

    toast.error(`Fetch games failed: ${error.response.data.error.message}`);
    return thunkApi.rejectWithValue(error.response.data);
  }
});

export const fetchPermalinks = createAsyncThunk<string[], string>(
  "permalinks/fetchPermalinks",
  async (brandId: string, thunkApi) => {
    try {
      const response = await api.games.getPermalinks(brandId);

      const permalinks = response.data.data;
      return permalinks;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch permalinks failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch permalinks failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const fetchGameManufacturers = createAsyncThunk<GameManufacturer[], { countryId?: string }>(
  "games/fetchGameManufacturers",
  async ({ countryId }, thunkApi) => {
    try {
      const response = await api.games.getGameManufacturers(countryId);
      return response.data.data;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Fetch game manufacturers failed: ${error.message}`);
        throw err;
      }

      toast.error(`Fetch game manufacturers failed: ${error.response.data.error.message}`);
      return thunkApi.rejectWithValue(error.response.data);
    }
  }
);

export const addGame = createAsyncThunk("games/addGame", async (game: Game, thunkApi) => {
  try {
    await api.games.addGame(game);
    toast.success(`Game added!`);
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Add game failed: ${error.message}`);
      throw err;
    }

    toast.error(`Add game failed: ${error.response.data.error.message}`);
    return thunkApi.rejectWithValue(error.response.data);
  }
});

export const updateGame = createAsyncThunk<
  { id: number; changes: Partial<Game> },
  { gameId: number; game: Partial<Game> }
>("games/updateGame", async ({ gameId, game }, thunkApi) => {
  try {
    await api.games.updateGame(gameId, game);

    toast.success(`Game updated!`);
    return { id: gameId, changes: { ...game } };
  } catch (err) {
    const error: AxiosError<ApiServerError> = err;

    if (!error.response) {
      toast.error(`Update game failed: ${error.message}`);
      throw err;
    }

    toast.error(`Update game failed: ${error.response.data.error.message}`);
    return thunkApi.rejectWithValue(error.response.data);
  }
});

export const removeGame = createAsyncThunk<number, number>(
  "gamesPage/removeGame",
  async (gameId: number, { rejectWithValue }) => {
    try {
      await api.games.removeGame(gameId);
      toast.success(`Game removed!`);
      return gameId;
    } catch (err) {
      const error: AxiosError<ApiServerError> = err;

      if (!error.response) {
        toast.error(`Remove game failed: ${error.message}`);
        throw err;
      }

      toast.error(`Remove game failed: ${error.response.data.error.message}`);
      return rejectWithValue(error.response.data);
    }
  }
);

const gamesSlice = createSlice({
  name: "gamesPage",
  initialState,
  reducers: {
    resetGamesState: () => initialState
  },
  extraReducers: builder => {
    builder.addCase(fetchGames.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchGames.fulfilled, (state, action) => {
      gamesAdapter.setAll(state, action.payload);
      state.isLoading = false;
    });
    builder.addCase(fetchGames.rejected, (state, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
      state.isLoading = false;
    });
    builder.addCase(fetchPermalinks.fulfilled, (state, action) => {
      state.permalinks = action.payload;
    });
    builder.addCase(fetchPermalinks.rejected, (_, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
    });
    builder.addCase(fetchGameManufacturers.fulfilled, (state, action) => {
      state.gameManufacturer = action.payload;
    });
    builder.addCase(fetchGameManufacturers.rejected, (_, action) => {
      const { meta } = action;
      if (meta.aborted) {
        return;
      }
    });
    builder.addCase(removeGame.fulfilled, (state, action) => {
      const gameId = action.payload;
      gamesAdapter.removeOne(state, gameId);
    });
    builder.addCase(updateGame.fulfilled, (state, action) => {
      const { id, changes } = action.payload;
      gamesAdapter.updateOne(state, { id, changes });
    });
  }
});

export const {
  reducer,
  actions: { resetGamesState }
} = gamesSlice;

export const getGamesPageState = (state: RootState) => state.gamesPage;

export const { selectAll: selectAllGames, selectById: selectGameById } = gamesAdapter.getSelectors(getGamesPageState);

export const selectGameListOptions = createSelector(selectAllGames, (games: Game[]) =>
  games
    .filter(({ removedAt }) => !removedAt)
    .map(({ id, name, permalink, manufacturer }) => ({ value: id, label: name, permalink, manufacturer }))
);

export const selectPermalinks = createSelector(getGamesPageState, gamesState =>
  gamesState.permalinks.map(permalink => ({ label: permalink, value: permalink }))
);

export const selectGameManufacturers = createSelector(getGamesPageState, gamesState => gamesState.gameManufacturer);

export const selectIsLoading = createSelector(getGamesPageState, gamesState => gamesState.isLoading);
