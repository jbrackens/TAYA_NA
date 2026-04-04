import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import uniq from "lodash/uniq";
import includes from "lodash/fp/includes";
import find from "lodash/fp/find";

import api from "@idefix-backoffice/idefix/api";
import { BadgeValue, DIALOG } from "@idefix-backoffice/idefix/types";

import {
  addStickyPlayer as addStickyPlayerToCore,
  fetchStickyPlayers,
  removeStickyPlayer as removeStickyPlayerFromCore,
  searchPlayers
} from "../players";
import { calculateValues } from "./helpers";

import { dialogsSlice } from "../../";
import { RootState } from "../../rootReducer";
import { AppDispatch } from "../../createStore";

interface SidebarState {
  searchQuery: string;
  selectedBrand: string | undefined;
  filters: {
    closed: boolean;
  };
  tab: string;
  badgeValues: BadgeValue[];
  lockedPlayerUserMap: { [key: number]: { id: number; handle: string } };
  playerTabs: { [key: number]: string };
  stickyPlayerIds: number[];
}

const initialState: SidebarState = {
  searchQuery: "",
  selectedBrand: undefined,
  filters: {
    closed: false
  },
  tab: "all",
  badgeValues: [],
  lockedPlayerUserMap: {},
  playerTabs: {},
  stickyPlayerIds: []
};

export const changePlayerTabAction = createAction("sidebar/change-player-tab", (playerId: number, tab: string) => ({
  payload: { playerId, tab }
}));

export const changePlayerTab =
  (playerId: number, tab: string, skipLocked?: boolean) => (dispatch: AppDispatch, getState: () => RootState) => {
    if (!skipLocked) {
      const [tabType, ...rest] = tab.split("/");
      const taskIdentifier = rest.join("/");
      if (tabType === "tasks" && isPlayerLocked(getState(), playerId)) {
        return dispatch(dialogsSlice.openDialog(DIALOG.STEAL_PLAYER, { playerId, taskIdentifier }));
      }
    }
    return dispatch(changePlayerTabAction(playerId, tab));
  };

export const addStickyPlayerSuccess = createAction("sidebar/add-sticky-player-success", (playerId: number) => ({
  payload: playerId
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
  }
);

export const removeStickyPlayer = createAsyncThunk(
  "sidebar/remove-sticky-player",
  async (playerId: number, { dispatch, rejectWithValue }) => {
    try {
      await api.locks.release(playerId);
      dispatch(removeStickyPlayerFromCore(playerId));
      return playerId;
    } catch (error) {
      console.log(error, "error");
      return rejectWithValue(error);
    }
  }
);

export const updateLockedPlayers = createAsyncThunk("sidebar/update-locked-players", async () => {
  const lockedPlayerIds = await api.locks.get();
  return lockedPlayerIds;
});

export const initialize = (selectedPlayerId?: number) => async (dispatch: AppDispatch, getState: () => RootState) => {
  try {
    const { selectedBrand, tab, filters, searchQuery } = getSidebar(getState());

    const initialStickyPlayerIds = getStickyPlayerIds(getState());
    if (selectedPlayerId && !includes(selectedPlayerId, initialStickyPlayerIds)) {
      await dispatch(addStickyPlayer(selectedPlayerId));
    }
    const stickyPlayerIds = getStickyPlayerIds(getState());

    await Promise.all([
      dispatch(searchPlayers({ tab, query: { text: searchQuery, brandId: selectedBrand!, filters } })),
      dispatch(updateLockedPlayers()),
      dispatch(fetchStickyPlayers(stickyPlayerIds))
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
      state.searchQuery = action.payload;
    },
    selectBrand(state, action) {
      state.selectedBrand = action.payload === "all" ? undefined : action.payload;
    },
    toggleFilter(state, action: { payload: "closed" }) {
      state.filters = { ...state.filters, [action.payload]: !state.filters[action.payload] };
    },
    changeTab(state, action) {
      state.tab = action.payload;
    },
    updateSidebarStatus(state, action) {
      state.badgeValues = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(updateLockedPlayers.fulfilled, (state, action) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
        [playerId]: tab
      };
    });
  }
});

export const {
  reducer,
  actions: { changeSearchQuery, selectBrand, toggleFilter, changeTab, updateSidebarStatus }
} = sidebarSlice;

export const getSidebar = (state: RootState) => state.sidebar;
export const getRoles = (state: RootState) => state.app && state.app.roles;
export const getStickyPlayerIds = createSelector(getSidebar, sidebar => sidebar.stickyPlayerIds);
export const isPlayerLocked = (state: RootState, playerId: number) => !!state.sidebar.lockedPlayerUserMap[playerId];
export const getLockedPlayerUser = (state: RootState, playerId: number) => state.sidebar.lockedPlayerUserMap[playerId];
export const getPlayerTabs = createSelector(getSidebar, sidebar => sidebar.playerTabs);
export const getSearchQuery = createSelector(getSidebar, sidebar => sidebar.searchQuery);
export const getFilters = createSelector(getSidebar, sidebar => sidebar.filters);
export const getTab = createSelector(getSidebar, sidebar => sidebar.tab);
export const getSelectedBrand = createSelector(getSidebar, sidebar => sidebar.selectedBrand);
const getBadgeValues = createSelector(getSidebar, sidebar => sidebar.badgeValues);

export const getTasks = createSelector(
  getRoles as (state: RootState) => string[],
  getBadgeValues,
  (roles: string[], badgeValues: BadgeValue[]) => {
    return badgeValues.map(({ tasks, ...rest }) => ({
      ...rest,
      tasks: tasks.filter(({ requiredRole }) => roles?.includes(requiredRole))
    }));
  }
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
  }
);
