import { lobbyReducers } from "@brandserver-client/lobby";
import { combineReducers } from "@reduxjs/toolkit";
import { VieState } from "./types";

export const rootReducer = combineReducers<VieState>(lobbyReducers);
