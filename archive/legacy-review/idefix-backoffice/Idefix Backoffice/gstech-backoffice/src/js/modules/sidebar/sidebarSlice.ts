import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import uniq from "lodash/uniq";
import includes from "lodash/fp/includes";
import api from "../../core/api";
import {
  addStickyPlayer as addStickyPlayerToCore,
  fetchStickyPlayers,
  removeStickyPlayer as removeStickyPlayerFromCore,
  searchPlayers,
} from "../../core/data";
import { openDialog } from "../../dialogs";
import browserHistory from "../../history";
import { calculateValues } from "./utils";
import find from "lodash/fp/find";
import { RootState } from "js/rootReducer";
import { AppDispatch } from "../../../index";
import { BadgeValue, PlayerWithUpdate } from "app/types";

interface SidebarState {
  searchQuery: string;
  selectedBrand: string | undefined;
  filters: {
    closed: boolean;
  };
  filter: string;
  badgeValues: BadgeValue[];
  lockedPlayerUserMap: { [key: number]: { id: number; handle: string } };
  playerTabs: { [key: number]: string };
  stickyPlayerIds: number[];
}

const initialState: SidebarState = {
  searchQuery: "",
  selectedBrand: undefined,
  filters: {
    closed: false,
  },
  filter: "all",
  badgeValues: [],
  lockedPlayerUserMap: {},
  playerTabs: {},
  stickyPlayerIds: [],
};

export const changePlayerTabAction = createAction("sidebar/change-player-tab", (playerId: number, tab: string) => ({
  payload: { playerId, tab },
}));

export const changePlayerTab =
  (playerId: number, tab: string, skipLocked?: boolean) => (dispatch: AppDispatch, getState: () => RootState) => {
    if (!skipLocked) {
      const [tabType, ...rest] = tab.split("/");
      const taskIdentifier = rest.join("/");
      if (tabType === "tasks" && isPlayerLocked(getState(), playerId)) {
        return dispatch(openDialog("steal-player", { playerId, taskIdentifier }));
      }
    }
    browserHistory.push(`/players/@${playerId}/${tab}`);
    return dispatch(changePlayerTabAction(playerId, tab));
  };

export const addStickyPlayerSuccess = createAction("sidebar/add-sticky-player-success", (playerId: number) => ({
  payload: playerId,
}));

export const addStickyPlayer = createAsyncThunk<void, number>(
  "sidebar/add-sticky-player",
  async (playerId, { dispatch }) => {
    try {
      await api.locks.lock(playerId);
      dispatch(addStickyPlayerSuccess(playerId));
      dispatch(addStickyPlayerToCore(playerId));
    } catch (error) {
      console.log(error, "error");
      if (error.statusCode === 423) {
        dispatch(addStickyPlayerSuccess(playerId));
        dispatch(addStickyPlayerToCore(playerId));
      }
    }
  },
);

export const removeStickyPlayer = createAsyncThunk(
  "sidebar/remove-sticky-player",
  async (playerId: number, { dispatch }) => {
    try {
      await api.locks.release(playerId);
      dispatch(removeStickyPlayerFromCore(playerId));
      return playerId;
    } catch (error) {
      console.log(error, "error");
    }
  },
);

export const updateLockedPlayers = createAsyncThunk("sidebar/update-locked-players", async () => {
  const lockedPlayerIds = await api.locks.get();
  return lockedPlayerIds;
});

export const initialize = (selectedPlayerId?: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    const { selectedBrand, filter, filters, searchQuery } = getSidebar(getState());

    const initialStickyPlayerIds = getStickyPlayerIds(getState());
    if (selectedPlayerId && !includes(selectedPlayerId, initialStickyPlayerIds)) {
      await dispatch(addStickyPlayer(selectedPlayerId));
    }
    const stickyPlayerIds = getStickyPlayerIds(getState());

    await Promise.all([
      dispatch(searchPlayers({ tab: filter, query: { text: searchQuery, brandId: selectedBrand!, filters } })),
      dispatch(updateLockedPlayers()),
      dispatch(fetchStickyPlayers(stickyPlayerIds)),
    ]);
  } catch (err) {
    console.log(err, "err");
  }
};

export const updatePlayerList = () => (dispatch: AppDispatch) => {
  dispatch(initialize());
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    changeSearchQuery(state, action) {
      state.searchQuery = action.payload.target.value;
    },
    selectBrand(state, action) {
      state.selectedBrand = action.payload === "all" ? undefined : action.payload;
    },
    toggleFilter(state, action: { payload: "closed" }) {
      state.filters = { ...state.filters, [action.payload]: !state.filters[action.payload] };
    },
    changeFilter(state, action) {
      state.filter = action.payload;
    },
    updateSidebarStatus(state, action) {
      state.badgeValues = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(updateLockedPlayers.fulfilled, (state, action) => {
      state.lockedPlayerUserMap = action.payload;
    });
    builder.addCase(removeStickyPlayer.fulfilled, (state, action) => {
      state.stickyPlayerIds = state.stickyPlayerIds.filter(playerId => playerId !== action.payload);
    });
    builder.addCase(addStickyPlayerSuccess, (state, action) => {
      state.stickyPlayerIds = uniq([...state.stickyPlayerIds, action.payload]);
    });
    builder.addCase(changePlayerTabAction, (state, action) => {
      const { playerId, tab } = action.payload;
      state.playerTabs = {
        ...state.playerTabs,
        [playerId]: tab,
      };
    });
  },
});

export const {
  reducer,
  actions: { changeSearchQuery, selectBrand, toggleFilter, changeFilter, updateSidebarStatus },
} = sidebarSlice;

export const getSidebar = (state: RootState) => state.sidebar;
export const getData = (state: RootState) => state.data;
export const getRoles = (state: RootState) => state.app && state.app.roles;

export const getStickyPlayerIds = createSelector(getSidebar, sidebar => sidebar.stickyPlayerIds);

export const getPlayers = createSelector(getData, data => data.players);

export const getStickyPlayers = createSelector(getData, data => data.stickyPlayers);

export const getFilteredPlayers = createSelector(
  getPlayers,
  getStickyPlayerIds,
  (players: PlayerWithUpdate[], stickyPlayerIds: number[]) => {
    return players?.filter(player => !stickyPlayerIds?.includes(player.id));
  },
);

export const getIsFetching = createSelector(
  getData,
  data => data.isPlayersFetching > 0 || data.isStickyPlayersFetching > 0,
);

const getSelectedBrand = createSelector(getSidebar, sidebar => sidebar.selectedBrand);

const getBadgeValues = createSelector(getSidebar, sidebar => sidebar.badgeValues);

export const getTasks = createSelector(
  getRoles as (state: RootState) => string[],
  getBadgeValues,
  (roles: string[], badgeValues: BadgeValue[]) => {
    return badgeValues.map(({ tasks, ...rest }) => ({
      ...rest,
      tasks: tasks.filter(({ requiredRole }) => roles?.includes(requiredRole)),
    }));
  },
);

export const getCalculatedBadgeValues = createSelector(
  getSelectedBrand,
  getTasks,
  (selectedBrand: string | undefined, badgeValues: BadgeValue[]) => {
    if (!selectedBrand) {
      return calculateValues(badgeValues);
    }

    const brandBadgeValues = find(["brandId", selectedBrand], badgeValues);

    return calculateValues(brandBadgeValues, true);
  },
);

export const isPlayerLocked = (state: RootState, playerId: number) => !!state.sidebar.lockedPlayerUserMap[playerId];

export const getLockedPlayerUser = (state: RootState, playerId: number) => state.sidebar.lockedPlayerUserMap[playerId];
